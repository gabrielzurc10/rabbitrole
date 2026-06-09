import Link from "next/link";

export const metadata = {
  title: "Terms of Service — rabbitrole",
};

/**
 * Terms of Service. Static prose styled with the shared `legal-*` classes.
 * This is starter copy for a portfolio project — review and adjust the wording
 * to your actual situation before relying on it.
 */
export default function TermsPage() {
  return (
    <div className="legal">
      <h1 className="legal-title">Terms of Service</h1>
      <p className="legal-updated">Last updated: June 7, 2026</p>

      <div className="legal-prose">
        <p>
          rabbitrole (&ldquo;the service&rdquo;) is an AI resume reviewer and job
          matcher. By accessing or using the service, you agree to these terms.
          If you do not agree, please do not use the service.
        </p>

        <h2 className="legal-heading">Use of the service</h2>
        <p>
          You may use rabbitrole to upload a resume, receive AI-generated
          feedback, and view matching job postings. You agree to use it only for
          lawful purposes and not to upload content you do not have the right to
          share. The service is provided for evaluation and demonstration
          purposes and may change or be discontinued at any time.
        </p>

        <h2 className="legal-heading">Your content</h2>
        <p>
          You retain ownership of the resumes and information you upload. You
          grant rabbitrole permission to process that content to provide the
          service — including sending it to third-party AI providers to generate
          analysis and matches. See our{" "}
          <Link href="/privacy/" className="legal-link">
            Privacy Policy
          </Link>{" "}
          for how your data is handled.
        </p>

        <h2 className="legal-heading">AI-generated output</h2>
        <p>
          Resume feedback, scores, and job matches are generated automatically
          and may be inaccurate or incomplete. They are suggestions, not
          professional, legal, or career advice. You are responsible for any
          decisions you make based on the output.
        </p>

        <h2 className="legal-heading">Third-party links</h2>
        <p>
          Job postings link to external sites operated by employers and job
          boards. rabbitrole does not control and is not responsible for the
          content, accuracy, or availability of those sites or the roles they
          list.
        </p>

        <h2 className="legal-heading">Disclaimer & limitation of liability</h2>
        <p>
          The service is provided &ldquo;as is,&rdquo; without warranties of any
          kind. To the fullest extent permitted by law, rabbitrole is not liable
          for any damages arising from your use of the service.
        </p>

        <h2 className="legal-heading">Changes to these terms</h2>
        <p>
          These terms may be updated from time to time. Continued use of the
          service after a change means you accept the revised terms.
        </p>

        <h2 className="legal-heading">Contact</h2>
        <p>
          Questions about these terms? Reach out via our{" "}
          <Link href="/contact/" className="legal-link">
            contact page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
