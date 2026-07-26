import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "FamilyFlow backend is running.",
  });
});

export default router;
