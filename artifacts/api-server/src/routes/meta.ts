import { Router } from "express";

const router = Router();

const SKILLS = [
  "C/C++",
  "Python",
  "Java",
  "JavaScript/TypeScript",
  "C#",
  "Go",
  "Rust",
  "MATLAB",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "HTML/CSS",
  "Tailwind",
  "Django",
  "Flutter",
  "React Native",
  "Swift",
  "Kotlin",
  "TensorFlow",
  "PyTorch",
  "Scikit-learn",
  "OpenCV",
  "YOLO",
  "NLP",
  "Computer Vision",
  "Verilog",
  "VHDL",
  "SystemVerilog",
  "FPGA",
  "Arduino",
  "Raspberry Pi",
  "STM32",
  "PCB Design",
  "Cisco IOS",
  "Wireshark",
  "Network Security",
  "TCP/IP",
  "SDN",
  "RTOS",
  "Embedded C",
  "ARM Cortex",
  "Microcontrollers",
  "IoT",
  "Git",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "Linux",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST APIs",
  "Microservices",
  "Agile",
  "Figma",
  "UI/UX Design",
];

const TRACKS = [
  "Software Engineering",
  "Hardware Design",
  "Networks and Cybersecurity",
  "AI",
  "Embedded",
  "Other",
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

router.get("/meta/tracks", (_req, res) => {
  res.json(TRACKS);
});

export default router;
