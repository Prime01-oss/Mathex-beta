import React from 'react';
import './CommandBar.scss';

import {
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarResults,
  KBarSearch,
  useMatches,
  useRegisterActions,
} from 'kbar';

import { useTranslation } from 'react-i18next';
import { useGeneralContext } from '@components/GeneralContext';

// --- OPTIMIZATION: Moved outside main component ---
function RenderResults() {
  const { actions } = useGeneralContext();
  
  // Updating the actions using `useRegisterActions`
  useRegisterActions(actions);
  const { results } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div>{item}</div>
        ) : (
          <div className={`command-bar-result${active ? ' active' : ''}`}>
            {item.name}
          </div>
        )
      }
    />
  );
}

export function CommandBar() {
  const { t } = useTranslation();
  // Note: 'actions' is no longer needed here, it is retrieved inside RenderResults

  const animatorStyle = {
    maxWidth: '600px',
    width: '100%',
    zIndex: '20002', 
    padding: '10px 8px',
    outline: '1px solid var(--page-border)',
    backdropFilter: 'blur(7px)',
    background: 'var(--command-bar-bg)',
    color: 'hsla(var(--app-text-color), 1)',
    borderRadius: '12px',
    boxShadow: '0 0 10px 1px rgba(0, 0, 0, .25)',
    overflow: 'hidden',
  };

  return (
    <KBarPortal>
      <KBarPositioner style={{ width: 'unset', zIndex: 20001 }}>
        <KBarAnimator style={animatorStyle}>
          <KBarSearch
            className='command-bar-search'
            defaultPlaceholder={t('Prompt')}
          />
          <RenderResults />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}