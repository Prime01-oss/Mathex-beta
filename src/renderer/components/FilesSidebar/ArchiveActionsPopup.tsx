import React from 'react';
import './ArchiveActionsPopup.scss';
import { useTranslation } from 'react-i18next';

interface ArchiveActionsPopupProps {
  selectionCount: number;
  onSelectAll: () => void;
  onArchive: () => void;
  onCancel: () => void;
}

export const ArchiveActionsPopup: React.FC<ArchiveActionsPopupProps> = ({
  selectionCount,
  onSelectAll,
  onArchive,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <div className="archive-actions-popup">
      <div className="selection-count">
        {selectionCount} {t('selected')}
      </div>
      <div className="actions-buttons">
        <button onClick={onSelectAll} className="popup-button secondary">
          {t('Select All')}
        </button>
        <button onClick={onCancel} className="popup-button secondary">
          {t('Cancel')}
        </button>
        <button
          onClick={onArchive}
          disabled={selectionCount === 0}
          className="popup-button archive"
        >
          {t('Archive')} ({selectionCount})
        </button>
      </div>
    </div>
  );
};