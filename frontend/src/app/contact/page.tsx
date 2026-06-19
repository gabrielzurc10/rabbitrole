import { Icon } from "@/components/ui/icon";

export const metadata = {
  title: "Contact — rabbitrole",
};

const CONTACT_EMAIL = "gabriel.cruz.development@gmail.com";

/**
 * Contact page. Static prose styled with the shared `legal-*` classes, with a
 * single mailto for bug reports, questions, and concerns.
 */
export default function ContactPage() {
  return (
    <div className="legal">
      <h1 className="legal-title">Contact</h1>

      <div className="legal-prose">
        <p>
          If you want to report a bug, have a question, or have a concern about
          rabbitrole, you can reach us by email:
        </p>
        <p className="group inline-flex items-center gap-2">
          <Icon name="mail" className="icon-nudge-up h-4 w-4 text-primary-strong" />
          <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}
