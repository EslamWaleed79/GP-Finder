import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectApplicationsTable,
  projectsTable,
  connectRequestsTable,
  usersTable,
  type ProjectApplication,
} from "@workspace/db";

export class ProjectApplicationRepository {
  async apply(
    applicantId: number,
    projectId: number
  ): Promise<{ ok: boolean; error?: string; application?: ProjectApplication }> {
    // Check if already applied (pending or accepted)
    const [existing] = await db
      .select()
      .from(projectApplicationsTable)
      .where(
        and(
          eq(projectApplicationsTable.applicantId, applicantId),
          eq(projectApplicationsTable.projectId, projectId),
          sql`${projectApplicationsTable.status} IN ('pending','accepted')`
        )
      )
      .limit(1);
    if (existing) {
      return { ok: false, error: "You already have an active application to this project" };
    }

    // Block if user is already accepted in another project or is a leader
    const [activeProject] = await db
      .select()
      .from(projectApplicationsTable)
      .where(
        and(
          eq(projectApplicationsTable.applicantId, applicantId),
          eq(projectApplicationsTable.status, "accepted")
        )
      )
      .limit(1);
    if (activeProject) {
      return { ok: false, error: "You must leave your current project before joining a new one." };
    }
    const [leaderProject] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.leaderId, applicantId))
      .limit(1);
    if (leaderProject) {
      return { ok: false, error: "You must leave your current project before joining a new one." };
    }

    const [application] = await db
      .insert(projectApplicationsTable)
      .values({ applicantId, projectId })
      .returning();
    return { ok: true, application: application! };
  }

  async decide(
    applicationId: number,
    leaderId: number,
    action: "accepted" | "rejected" | "removed"
  ): Promise<{
    ok: boolean;
    error?: string;
    application?: ProjectApplication;
    connectedTeamMemberIds?: number[];
  }> {
    const [app] = await db
      .select()
      .from(projectApplicationsTable)
      .where(eq(projectApplicationsTable.id, applicationId))
      .limit(1);
    if (!app) return { ok: false, error: "Application not found" };

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, app.projectId))
      .limit(1);
    if (!project) return { ok: false, error: "Project not found" };
    if (project.leaderId !== leaderId) return { ok: false, error: "Forbidden" };

    if (action === "accepted") {
      if (app.status !== "pending")
        return { ok: false, error: "Can only accept pending applications" };

      // Count current accepted members
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(projectApplicationsTable)
        .where(
          and(
            eq(projectApplicationsTable.projectId, app.projectId),
            eq(projectApplicationsTable.status, "accepted")
          )
        );
      if (Number(count) >= project.maxMembers) {
        return { ok: false, error: "Project is full" };
      }

      // Block if applicant is already in another project
      const [otherAccepted] = await db
        .select()
        .from(projectApplicationsTable)
        .where(
          and(
            eq(projectApplicationsTable.applicantId, app.applicantId),
            eq(projectApplicationsTable.status, "accepted"),
            sql`${projectApplicationsTable.projectId} != ${app.projectId}`
          )
        )
        .limit(1);
      if (otherAccepted) {
        return {
          ok: false,
          error: "Applicant is already in another project",
        };
      }
    }

    if (action === "removed" && app.status !== "accepted") {
      return { ok: false, error: "Can only remove accepted members" };
    }

    const [updated] = await db
      .update(projectApplicationsTable)
      .set({ status: action, decidedAt: new Date() })
      .where(eq(projectApplicationsTable.id, applicationId))
      .returning();

    // Connection bridge: accept → create/update connect request to 'accepted'
    if (action === "accepted") {
      await this._upsertConnection(app.applicantId, leaderId, "accepted", app.projectId);
      const connectedTeamMemberIds = await this._connectNewMemberWithTeam(app.applicantId, app.projectId);
      await this._syncProjectStatus(app.projectId);
      return { ok: true, application: updated!, connectedTeamMemberIds };
    }

    // Revocation: left or removed → set connection to declined
    if (action === "removed") {
      await this._upsertConnection(app.applicantId, leaderId, "declined");
    }

    await this._syncProjectStatus(app.projectId);

    return { ok: true, application: updated! };
  }

  private async _connectNewMemberWithTeam(
    newMemberId: number,
    projectId: number
  ): Promise<number[]> {
    const rows = await db
      .select({ memberId: projectApplicationsTable.applicantId })
      .from(projectApplicationsTable)
      .where(
        and(
          eq(projectApplicationsTable.projectId, projectId),
          eq(projectApplicationsTable.status, "accepted"),
          sql`${projectApplicationsTable.applicantId} != ${newMemberId}`
        )
      );

    const connectedMemberIds: number[] = [];
    for (const row of rows) {
      await this._upsertConnection(newMemberId, row.memberId, "accepted", projectId);
      connectedMemberIds.push(row.memberId);
    }
    return connectedMemberIds;
  }

  async leave(
    applicationId: number,
    applicantId: number
  ): Promise<{ ok: boolean; error?: string; application?: ProjectApplication }> {
    const [app] = await db
      .select()
      .from(projectApplicationsTable)
      .where(eq(projectApplicationsTable.id, applicationId))
      .limit(1);
    if (!app) return { ok: false, error: "Application not found" };
    if (app.applicantId !== applicantId) return { ok: false, error: "Forbidden" };
    if (app.status !== "accepted") return { ok: false, error: "Can only leave if currently accepted" };

    const [updated] = await db
      .update(projectApplicationsTable)
      .set({ status: "left", decidedAt: new Date() })
      .where(eq(projectApplicationsTable.id, applicationId))
      .returning();

    // Revoke connection with leader
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, app.projectId))
      .limit(1);
    if (project?.leaderId) {
      await this._upsertConnection(applicantId, project.leaderId, "declined");
    }

    await this._syncProjectStatus(app.projectId);
    return { ok: true, application: updated! };
  }

  async isMemberOfProject(userId: number, projectId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: projectApplicationsTable.id })
      .from(projectApplicationsTable)
      .where(
        and(
          eq(projectApplicationsTable.applicantId, userId),
          eq(projectApplicationsTable.projectId, projectId),
          eq(projectApplicationsTable.status, "accepted")
        )
      )
      .limit(1);
    return Boolean(row);
  }

  async leaveProject(
    applicantId: number,
    projectId: number
  ): Promise<{ ok: boolean; error?: string; application?: ProjectApplication }> {
    const [app] = await db
      .select()
      .from(projectApplicationsTable)
      .where(
        and(
          eq(projectApplicationsTable.applicantId, applicantId),
          eq(projectApplicationsTable.projectId, projectId),
          eq(projectApplicationsTable.status, "accepted")
        )
      )
      .limit(1);
    if (!app) {
      return { ok: false, error: "You are not currently a member of this project" };
    }

    const [updated] = await db
      .update(projectApplicationsTable)
      .set({ status: "left", decidedAt: new Date() })
      .where(eq(projectApplicationsTable.id, app.id))
      .returning();

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);
    if (project?.leaderId) {
      await this._upsertConnection(applicantId, project.leaderId, "declined");
    }

    await this._syncProjectStatus(projectId);
    return { ok: true, application: updated! };
  }

  async listForProject(projectId: number): Promise<
    (ProjectApplication & {
      applicantName: string;
      applicantTrack: string | null;
      applicantCustomTrack: string | null;
      applicantSkills: string[];
      applicantBio: string | null;
      applicantBylaw: string | null;
      applicantGender: string | null;
    })[]
  > {
    const rows = await db
      .select({
        id: projectApplicationsTable.id,
        applicantId: projectApplicationsTable.applicantId,
        projectId: projectApplicationsTable.projectId,
        status: projectApplicationsTable.status,
        requestedAt: projectApplicationsTable.requestedAt,
        decidedAt: projectApplicationsTable.decidedAt,
        applicantName: usersTable.name,
        applicantTrack: usersTable.track,
        applicantCustomTrack: usersTable.customTrack,
        applicantSkills: usersTable.skills,
        applicantBio: usersTable.bio,
        applicantBylaw: usersTable.bylaw,
        applicantGender: usersTable.gender,
      })
      .from(projectApplicationsTable)
      .innerJoin(
        usersTable,
        eq(projectApplicationsTable.applicantId, usersTable.id)
      )
      .where(eq(projectApplicationsTable.projectId, projectId));
    return rows;
  }

  async listForUser(userId: number): Promise<ProjectApplication[]> {
    return db
      .select()
      .from(projectApplicationsTable)
      .where(eq(projectApplicationsTable.applicantId, userId));
  }

  async getApplicationStatus(
    userId: number
  ): Promise<{ isLeader: boolean; hasAcceptedApp: boolean; pendingProjectIds: number[] }> {
    const leaderProjects = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.leaderId, userId));

    const apps = await db
      .select()
      .from(projectApplicationsTable)
      .where(eq(projectApplicationsTable.applicantId, userId));

    return {
      isLeader: leaderProjects.length > 0,
      hasAcceptedApp: apps.some((a) => a.status === "accepted"),
      pendingProjectIds: apps
        .filter((a) => a.status === "pending")
        .map((a) => a.projectId),
    };
  }

  private async _syncProjectStatus(projectId: number): Promise<void> {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);
    if (!project) return;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectApplicationsTable)
      .where(
        and(
          eq(projectApplicationsTable.projectId, projectId),
          eq(projectApplicationsTable.status, "accepted")
        )
      );

    const memberCount = Number(count);
    const nextStatus = memberCount >= project.maxMembers ? "closed" : "open";

    if (project.status !== nextStatus) {
      await db
        .update(projectsTable)
        .set({ status: nextStatus })
        .where(eq(projectsTable.id, projectId));
    }
  }

  private async _upsertConnection(
    userId1: number,
    userId2: number,
    status: "accepted" | "declined",
    projectId?: number | null
  ): Promise<void> {
    const [existing] = await db
      .select()
      .from(connectRequestsTable)
      .where(
        sql`(${connectRequestsTable.senderId} = ${userId1} AND ${connectRequestsTable.recipientId} = ${userId2})
          OR (${connectRequestsTable.senderId} = ${userId2} AND ${connectRequestsTable.recipientId} = ${userId1})`
      )
      .limit(1);

    if (existing) {
      await db
        .update(connectRequestsTable)
        .set({ status, projectId: projectId ?? null })
        .where(eq(connectRequestsTable.id, existing.id));
    } else {
      await db
        .insert(connectRequestsTable)
        .values({ senderId: userId1, recipientId: userId2, status, projectId: projectId ?? null });
    }
  }
}
