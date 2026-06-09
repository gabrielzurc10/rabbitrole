import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — rabbitrole",
};

/**
 * Privacy Policy. Static prose styled with the shared `legal-*` classes.
 * This is starter copy for a portfolio project — review and adjust the wording
 * to your actual data handling before relying on it.
 */
export default function PrivacyPage() {
  return (
    <div className="legal">
      <h1 className="legal-title">Privacy Policy</h1>
      <p className="legal-updated">Last updated: June 7, 2026</p>

      <div className="legal-prose">
        <p>
          This policy explains what rabbitrole collects and how it is used. We
          aim to collect only what is needed to provide the service.
        </p>

        <h2 className="legal-heading">What we collect</h2>
        <p>
          When you sign in, we store your email address (or Google account
          identifier) to identify your account. When you use the service, we
          store the resume file you upload, the target roles you choose, and the
          AI-generated analysis and job matches tied to your account.
        </p>

        <h2 className="legal-heading">How we use it</h2>
        <p>
          Your resume and selected roles are sent to third-party AI providers
          (OpenAI) to generate feedback and to a job search provider (JSearch /
          OpenWeb Ninja) to find matching postings. We use your account
          identifier to associate your data with you and let you sign back in.
        </p>

        <h2 className="legal-heading">Where it is stored</h2>
        <p>
          Account data and uploaded resumes are stored in our cloud
          infrastructure (Amazon Web Services). We do not sell your personal
          information.
        </p>

        <h2 className="legal-heading">Third-party services</h2>
        <p>
          We rely on third parties to operate the service, including Amazon
          Cognito for sign-in, OpenAI for AI analysis, and JSearch for job data.
          Your use of the service is also subject to their respective privacy
          practices.
        </p>

        <h2 className="legal-heading">Your choices</h2>
        <p>
          You can request deletion of your account and associated data at any
          time via our{" "}
          <Link href="/contact/" className="legal-link">
            contact page
          </Link>
          .
        </p>

        <h2 className="legal-heading">Changes to this policy</h2>
        <p>
          This policy may be updated from time to time. Material changes will be
          reflected by the &ldquo;last updated&rdquo; date above.
        </p>

        <h2 className="legal-heading">Related</h2>
        <p>
          See our{" "}
          <Link href="/terms/" className="legal-link">
            Terms of Service
          </Link>{" "}
          for the rules that govern use of the service.
        </p>
      </div>
    </div>
  );
}
