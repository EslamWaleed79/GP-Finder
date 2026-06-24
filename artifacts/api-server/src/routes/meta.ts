import { Router } from "express";

const router = Router();

const SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Java",
  "C++",
  "C",
  "C#",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Kubernetes",
  "AWS",
  "Git",
  "Linux",
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "NLP",
  "Data Analysis",
  "TensorFlow",
  "PyTorch",
  "Flutter",
  "React Native",
  "Android",
  "iOS",
  "Swift",
  "Kotlin",
  "Figma",
  "UI/UX Design",
  "Embedded Systems",
  "FPGA",
  "Arduino",
  "Raspberry Pi",
  "Networking",
  "Cybersecurity",
  "Blockchain",
  "IoT",
  "MATLAB",
  "OpenCV",
  "Spring Boot",
  "Django",
  "FastAPI",
  "Express.js",
  "GraphQL",
  "REST APIs",
  "Microservices",
  "Agile",
];

const MAJORS = [
  "Computer Engineering",
  "Electronics Engineering",
  "Communications Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Systems & Biomedical Engineering",
  "Architecture Engineering",
  "Construction Engineering",
  "Mining Engineering",
];

router.get("/meta/skills", (_req, res) => {
  res.json(SKILLS.sort());
});

router.get("/meta/majors", (_req, res) => {
  res.json(MAJORS.sort());
});

export default router;
