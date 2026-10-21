import { useEffect, useRef } from "react";
import { X, ShieldCheck } from "lucide-react";
export function PrivacyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="privacy-title"
      className="privacy-dialog"
    >
      <div className="dialog-heading">
        <ShieldCheck size={24} />
        <h2 id="privacy-title">Your information, explained.</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close privacy information"
        >
          <X />
        </button>
      </div>
      <div className="dialog-content">
        <h3>Processing is not the same as saving</h3>
        <p>
          Your upload and context are sent to this application’s server to
          extract and organize results. The application does not implement
          server-side report history. Hosting providers may maintain operational
          logs under their own policies.
        </p>
        <h3>Cloud processing is optional</h3>
        <p>
          Only with your permission, a report image/PDF may be sent to Google
          Gemini for transcription. An optional explanation sends structured
          results, symptoms, and context to Google. Files may contain
          identifying details. Provider policies apply; do not upload
          information you are not authorized to share.
        </p>
        <h3>Saving is your choice</h3>
        <p>
          “Save on this device” stores the report and context in this browser’s
          local storage. It is not encrypted by this app and may be visible to
          anyone using this browser. Up to 10 reports are kept, and the app
          excludes reports older than 30 days when loading. Use “Delete all” to
          remove them now.
        </p>
        <h3>Not a medical decision-maker</h3>
        <p>
          Extraction can miss or misread values. Check the original report and
          seek a qualified clinician’s advice. This app does not diagnose,
          prescribe, determine urgency, or guarantee that a report is normal.
        </p>
      </div>
      <button className="button primary" onClick={onClose}>
        Understood
      </button>
    </dialog>
  );
}
