import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account — Arzo",
  description: "Instructions for deleting your Arzo account and all associated data.",
};

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-bg-app flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-red/10 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent-red"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-semibold text-text-primary mb-2">
            Delete Your Account
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            If you would like to permanently delete your Arzo account and all
            associated data, please follow the instructions below.
          </p>
        </div>

        {/* Steps Card */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-4">
            How to request account deletion:
          </h2>

          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-jade text-text-on-jade text-xs font-semibold flex items-center justify-center">
                1
              </span>
              <p className="text-sm text-text-secondary leading-relaxed pt-0.5">
                Send an email to{" "}
                <a
                  href="mailto:info@arzo.com?subject=Account%20Deletion%20Request"
                  className="text-jade font-semibold hover:underline"
                >
                  info@arzo.com
                </a>{" "}
                from the email address associated with your account.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-jade text-text-on-jade text-xs font-semibold flex items-center justify-center">
                2
              </span>
              <p className="text-sm text-text-secondary leading-relaxed pt-0.5">
                Include <strong className="text-text-primary">&quot;Account Deletion Request&quot;</strong> as the subject line.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-jade text-text-on-jade text-xs font-semibold flex items-center justify-center">
                3
              </span>
              <p className="text-sm text-text-secondary leading-relaxed pt-0.5">
                We will verify your identity and permanently delete your account
                and all data within <strong className="text-text-primary">7 business days</strong>.
              </p>
            </li>
          </ol>
        </div>

        {/* What gets deleted */}
        <div className="bg-bg-elevated border border-border-subtle rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            What gets deleted:
          </h2>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li>• Your account and login credentials</li>
            <li>• All saved income entries and progress history</li>
            <li>• All saved wealth projections</li>
            <li>• Any personal information (name, email)</li>
          </ul>
        </div>

        {/* Warning */}
        <p className="text-center text-xs text-accent-red mb-6">
          This action is permanent and cannot be undone. Once deleted, your data
          cannot be recovered.
        </p>

        {/* CTA Button */}
        <a
          href="mailto:info@arzo.com?subject=Account%20Deletion%20Request&body=Hi%20Arzo%20Team%2C%0A%0AI%20would%20like%20to%20request%20the%20deletion%20of%20my%20account.%0A%0ARegistered%20email%3A%20(your%20account%20email)%0A%0APlease%20confirm%20once%20my%20account%20and%20all%20associated%20data%20have%20been%20removed.%0A%0AThank%20you."
          className="block w-full text-center bg-accent-red text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          Send Deletion Request
        </a>
        <p className="text-center text-xs text-text-muted mt-3">
          This will open your email app with a pre-filled message to info@arzo.com
        </p>
      </div>
    </main>
  );
}
