"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";

interface Props {
  /** When provided, the modal is controlled externally.
   *  Pass `true` to show it, `false`/`undefined` for auto-detect mode. */
  forceShow?: boolean;
  /** Called after the user dismisses or grants permission */
  onClose?: () => void;
}

export function LocationPermissionModal({ forceShow, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    // Controlled mode: show when parent says so
    if (forceShow !== undefined) {
      setVisible(forceShow);
      return;
    }
  }, [forceShow]);

  const dismiss = () => {
    setVisible(false);
    onClose?.();
  };

  const handleEnable = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("Location granted:", pos.coords);
          setPermissionGranted(true);
          setTimeout(() => {
            dismiss();
          }, 1200);
        },
        (err) => {
          console.warn("Location denied:", err.message);
          dismiss();
        }
      );
    }
  };

  const handleCancel = () => {
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="location-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="loc-modal-title">
      <div className="location-modal-card">
        {/* Close button */}
        <button className="location-modal-close" onClick={handleCancel} aria-label="Close">
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="location-modal-icon-wrap">
          <MapPin className="location-modal-icon" size={34} />
        </div>

        {/* Content */}
        <h2 id="loc-modal-title" className="location-modal-title">
          Enable Location Services
        </h2>
        <p className="location-modal-desc">
          Location services are required to use safety features like nearby alerts, emergency assistance, and real-time monitoring. Please enable GPS to get started.
        </p>

        {/* Success state */}
        {permissionGranted && (
          <p className="location-modal-success">✓ Location access granted!</p>
        )}

        {/* Actions */}
        {!permissionGranted && (
          <div className="location-modal-actions">
            <button className="location-modal-btn-cancel" onClick={handleCancel}>
              CANCEL
            </button>
            <button className="location-modal-btn-enable" onClick={handleEnable}>
              ENABLE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
