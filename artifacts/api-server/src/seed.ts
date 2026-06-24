import { db } from "@workspace/db";
import {
  usersTable,
  projectsTable,
  connectRequestsTable,
  notificationsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function runSeed() {
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable);
  if (Number(countRow?.count ?? 0) > 0) {
    return;
  }

  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const [admin] = await db
    .insert(usersTable)
    .values({
      name: "Admin User",
      email: "admin@eng.asu.edu.eg",
      passwordHash,
      major: "Computer Engineering",
      skills: ["Management", "Python", "SQL"],
      bio: "Platform administrator.",
      role: "admin",
    })
    .returning();

  const [ahmed] = await db
    .insert(usersTable)
    .values({
      name: "Ahmed Hassan",
      email: "ahmed.hassan@eng.asu.edu.eg",
      passwordHash,
      major: "Computer Engineering",
      skills: ["Python", "Machine Learning", "TensorFlow", "React", "Node.js"],
      bio: "Passionate about AI and building useful tools for engineers. Looking for a graduation project in applied ML.",
      phone: "+20 100 123 4567",
      role: "student",
    })
    .returning();

  const [sara] = await db
    .insert(usersTable)
    .values({
      name: "Sara Khalil",
      email: "sara.khalil@eng.asu.edu.eg",
      passwordHash,
      major: "Communications Engineering",
      skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"],
      bio: "Full-stack developer with a love for clean architecture. Open to join interesting projects.",
      phone: "+20 101 234 5678",
      role: "student",
    })
    .returning();

  const [omar] = await db
    .insert(usersTable)
    .values({
      name: "Omar Mostafa",
      email: "omar.mostafa@eng.asu.edu.eg",
      passwordHash,
      major: "Systems & Biomedical Engineering",
      skills: ["C++", "Embedded Systems", "Arduino", "MATLAB", "Raspberry Pi"],
      bio: "Embedded systems enthusiast. Have experience with RTOS and IoT projects. Looking for hardware-software integration projects.",
      role: "student",
    })
    .returning();

  const [nour] = await db
    .insert(usersTable)
    .values({
      name: "Nour Ibrahim",
      email: "nour.ibrahim@eng.asu.edu.eg",
      passwordHash,
      major: "Computer Engineering",
      skills: ["Python", "Computer Vision", "OpenCV", "Deep Learning", "PyTorch"],
      bio: "Computer vision researcher. Working on object detection and tracking. Looking for a team for a medical imaging project.",
      role: "student",
    })
    .returning();

  const [youssef] = await db
    .insert(usersTable)
    .values({
      name: "Youssef Saad",
      email: "youssef.saad@eng.asu.edu.eg",
      passwordHash,
      major: "Electronics Engineering",
      skills: ["FPGA", "Embedded Systems", "C", "MATLAB", "Networking"],
      bio: "Hardware engineer with a software mindset. Interested in edge computing and signal processing.",
      role: "student",
    })
    .returning();

  const [p1] = await db
    .insert(projectsTable)
    .values({
      title: "AI-Powered Medical Diagnosis Assistant",
      description:
        "Build a deep learning system that assists radiologists in detecting anomalies in chest X-rays and CT scans. We plan to use transfer learning from pre-trained models and build a web interface for clinicians. This is a high-impact project with a real hospital partner.",
      requiredSkills: ["Python", "Deep Learning", "Computer Vision", "PyTorch", "React"],
      status: "open",
      ownerId: nour!.id,
      teamSizeCap: 4,
    })
    .returning();

  const [p2] = await db
    .insert(projectsTable)
    .values({
      title: "Smart Campus Energy Management System",
      description:
        "Design and implement an IoT-based system to monitor and optimize energy consumption across the Ain Shams campus buildings. Involves sensor networks, edge computing nodes, and a real-time dashboard. Hardware prototyping required.",
      requiredSkills: ["IoT", "Embedded Systems", "Arduino", "React", "Node.js", "PostgreSQL"],
      status: "open",
      ownerId: omar!.id,
      teamSizeCap: 5,
    })
    .returning();

  const [p3] = await db
    .insert(projectsTable)
    .values({
      title: "Distributed Peer-to-Peer File Sharing Platform",
      description:
        "A BitTorrent-inspired distributed file sharing system with end-to-end encryption, a discovery server, and a modern React frontend. Focus on network protocol design and distributed systems concepts.",
      requiredSkills: ["TypeScript", "Node.js", "React", "Networking", "Docker"],
      status: "in_progress",
      ownerId: sara!.id,
      teamSizeCap: 3,
    })
    .returning();

  const [p4] = await db
    .insert(projectsTable)
    .values({
      title: "Graduation Project Matchmaking Platform",
      description:
        "A web platform to help engineering students at ASU find graduation projects and teammates — ironically, this very platform. Core challenges: privacy-preserving contact sharing, skill-based matching, and double opt-in connection model.",
      requiredSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Machine Learning"],
      status: "closed",
      ownerId: ahmed!.id,
      teamSizeCap: 4,
    })
    .returning();

  const [conn1] = await db
    .insert(connectRequestsTable)
    .values({
      senderId: ahmed!.id,
      recipientId: nour!.id,
      projectId: p1!.id,
      status: "accepted",
    })
    .returning();

  const [conn2] = await db
    .insert(connectRequestsTable)
    .values({
      senderId: sara!.id,
      recipientId: ahmed!.id,
      status: "accepted",
    })
    .returning();

  await db.insert(connectRequestsTable).values({
    senderId: youssef!.id,
    recipientId: omar!.id,
    projectId: p2!.id,
    status: "pending",
  });

  await db.insert(notificationsTable).values([
    {
      userId: nour!.id,
      message: `Ahmed Hassan sent you a connection request for "AI-Powered Medical Diagnosis Assistant"`,
      read: false,
    },
    {
      userId: ahmed!.id,
      message: `Nour Ibrahim accepted your connection request — you can now see their contact info`,
      read: false,
    },
    {
      userId: ahmed!.id,
      message: `Sara Khalil sent you a connection request`,
      read: true,
    },
    {
      userId: omar!.id,
      message: `Youssef Saad sent you a connection request for "Smart Campus Energy Management System"`,
      read: false,
    },
  ]);

  console.log("Seed complete. Demo accounts created with password: password123");
  console.log("  admin@eng.asu.edu.eg (admin)");
  console.log("  ahmed.hassan@eng.asu.edu.eg (student)");
  console.log("  sara.khalil@eng.asu.edu.eg (student)");
  console.log("  omar.mostafa@eng.asu.edu.eg (student)");
  console.log("  nour.ibrahim@eng.asu.edu.eg (student)");
  console.log("  youssef.saad@eng.asu.edu.eg (student)");
}
