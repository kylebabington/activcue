import { Link } from "react-router-dom";
import { LEGAL_PATHS } from "../config/legal.js";

export default function LegalConsentNote({
  action = "creating an account",
}) {
  return (
    <p className="legal-consent-note">
      By {action} you agree to the{" "}
      <Link to={LEGAL_PATHS.terms}>Terms of Use</Link> and{" "}
      <Link to={LEGAL_PATHS.privacy}>Privacy Policy</Link>.{" "}
      <Link to={LEGAL_PATHS.contact}>Contact us</Link> if you have questions.
    </p>
  );
}
