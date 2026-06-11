import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Family Activity Helper backend is running.",
  });
});

export default router;
