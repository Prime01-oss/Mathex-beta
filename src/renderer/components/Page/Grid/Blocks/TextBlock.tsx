import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 1. Runtime Imports
import {
  createEditor,
  Editor,
  Element as SlateElement,
  Point,
  Range,
  Transforms,
} from 'slate';

import { withHistory } from 'slate-history';
import { 
  Editable, 
  ReactEditor, 
  Slate, 
  withReact, 
  useSlate,
  useFocused,
} from 'slate-react';

// 2. Type Imports
import type {
  Descendant,
  BaseEditor,
} from 'slate';
import type { HistoryEditor } from 'slate-history';
import type { 
  RenderElementProps, 
  RenderLeafProps 
} from 'slate-react';

import { ValueProps } from '@renderer/common/types';
import { useTranslation } from 'react-i18next';

// --- Type Definitions ---

// Updated to include 'underline'
type CustomText = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; code?: boolean };
type MarkType = keyof Omit<CustomText, 'text'>;

type ParagraphElement = { type: 'paragraph'; children: CustomText[] };
type HeadingElement = { type: 'heading-one' | 'heading-two' | 'heading-three'; children: CustomText[] };
type BlockQuoteElement = { type: 'block-quote'; children: CustomText[] };
type BulletedListElement = { type: 'bulleted-list'; children: ListItemElement[] };
type ListItemElement = { type: 'list-item'; children: CustomText[] };
type CheckListItemElement = { type: 'check-list-item'; checked: boolean; children: CustomText[] };
type CodeBlockElement = { type: 'code-block'; children: CustomText[] };

type CustomElement = 
  | ParagraphElement 
  | HeadingElement 
  | BlockQuoteElement 
  | BulletedListElement 
  | ListItemElement
  | CheckListItemElement
  | CodeBlockElement;

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// --- Plugins ---

const withChecklists = (editor: Editor) => {
  const { deleteBackward } = editor;

  editor.deleteBackward = (...args) => {
    const { selection } = editor;

    if (selection && Range.isCollapsed(selection)) {
      const [match] = Editor.nodes(editor, {
        match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'check-list-item',
      });

      if (match) {
        const [, path] = match;
        const start = Editor.start(editor, path);

        if (Point.equals(selection.anchor, start)) {
          Transforms.setNodes(editor, {
            type: 'paragraph',
          } as Partial<CustomElement>);
          return;
        }
      }
    }
    deleteBackward(...args);
  };

  return editor;
};

const withShortcuts = (editor: Editor) => {
  const { insertText } = editor;

  editor.insertText = (text) => {
    const { selection } = editor;

    if (text.endsWith(' ') && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = { anchor, focus: start };
      const beforeText = Editor.string(editor, range) + text.slice(0, -1);
      
      const SHORTCUTS: Record<string, CustomElement['type']> = {
        '*': 'list-item',
        '-': 'list-item',
        '+': 'list-item',
        '>': 'block-quote',
        '#': 'heading-one',
        '##': 'heading-two',
        '###': 'heading-three',
        '[]': 'check-list-item',
        '```': 'code-block'
      };

      const type = SHORTCUTS[beforeText];

      if (type) {
        Transforms.select(editor, range);
        if (!Range.isCollapsed(range)) {
          Transforms.delete(editor);
        }

        const newProperties: Partial<CustomElement> = { type };
        Transforms.setNodes<SlateElement>(editor, newProperties, {
          match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
        });

        if (type === 'list-item') {
          const list: BulletedListElement = { type: 'bulleted-list', children: [] };
          Transforms.wrapNodes(editor, list, {
            match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'list-item',
          });
        }
        
        if (type === 'check-list-item') {
           Transforms.setNodes(editor, { checked: false } as Partial<CustomElement>);
        }

        return;
      }
    }
    insertText(text);
  };
  return editor;
};

// --- Components ---

const HoveringToolbar = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const editor = useSlate();
  const isFocused = useFocused();
  const { selection } = editor;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!selection || !isFocused) {
      el.removeAttribute('style');
      return;
    }

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return;

    const domRange = domSelection.getRangeAt(0);
    let rect = domRange.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      try {
        const domNode = ReactEditor.toDOMNode(editor, editor);
        const activeBlock = domNode.querySelector('[data-slate-node="element"]'); 
        if (activeBlock) {
             rect = activeBlock.getBoundingClientRect();
             rect = { ...rect.toJSON(), width: 0 }; 
        }
      } catch (e) {
        return;
      }
    }

    el.style.opacity = '1';
    el.style.top = `${rect.top + window.scrollY - el.offsetHeight - 10}px`;
    
    let leftPos = rect.left + window.scrollX - el.offsetWidth / 2 + rect.width / 2;
    if (leftPos < 10) leftPos = 10;
    
    el.style.left = `${leftPos}px`;
  });

  if (!isFocused || !selection) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="floating-toolbar"
      onMouseDown={(e) => {
        e.preventDefault(); 
      }}
    >
      <FormatButton format="bold" icon="B" />
      <FormatButton format="italic" icon="I" />
      <FormatButton format="underline" icon="U" /> {/* Added Underline Button */}
      <FormatButton format="code" icon="<>" />
    </div>
  );
};

const FormatButton = ({ format, icon }: { format: MarkType; icon: string }) => {
  const editor = useSlate();
  
  const isActive = (() => {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  })();

  const toggleFormat = () => {
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  };

  return (
    <button
      className={isActive ? 'active' : ''}
      onClick={(event) => {
        event.preventDefault();
        toggleFormat();
      }}
    >
      {icon}
    </button>
  );
};

// --- Renderers ---

const Element = (props: RenderElementProps) => {
  const { attributes, children, element } = props;
  const editor = useSlate();

  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>;
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>;
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>;
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>;
    case 'heading-three':
      return <h3 {...attributes}>{children}</h3>;
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'code-block':
      return (
        <pre {...attributes}>
           <code>{children}</code>
        </pre>
      );
    case 'check-list-item':
      return (
        <div {...attributes} className="check-list-item">
          <span
            contentEditable={false}
            className="checkbox"
            onClick={() => {
              const path = ReactEditor.findPath(editor, element);
              const newProperties: Partial<CheckListItemElement> = {
                checked: !element.checked,
              };
              Transforms.setNodes(editor, newProperties, { at: path });
            }}
          >
            {element.checked ? '☑' : '☐'}
          </span>
          <span className={element.checked ? 'checked-text' : ''}>
            {children}
          </span>
        </div>
      );
    default:
      return <p {...attributes}>{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.underline) children = <u>{children}</u>; // Added Underline Rendering
  if (leaf.code) children = <code>{children}</code>;
  return <span {...attributes}>{children}</span>;
};

// --- Main Component ---

const TextBlockContent = ({ content, blockStateFunction }: ValueProps) => {
  const { t } = useTranslation();
  
  const initialValue = Array.isArray(content) && content.length > 0 
    ? (content as Descendant[]) 
    : [{ type: 'paragraph', children: [{ text: '' }] } as ParagraphElement];

  const renderElement = useCallback((props: RenderElementProps) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);

  const editor = useMemo(
    () => withChecklists(withShortcuts(withHistory(withReact(createEditor())))),
    []
  );

  const [value, setValue] = useState<Descendant[]>(initialValue);

  useEffect(() => {
    blockStateFunction(value);
  }, [value]);

  return (
    <Slate editor={editor} value={value} onChange={v => setValue(v)}>
      <HoveringToolbar />
      <Editable
        className='textbox'
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder={t("Type...")}
        spellCheck={false}
        autoFocus
        onKeyDown={(event) => {
          if (!event.ctrlKey && !event.metaKey) return;
          
          switch (event.key) {
            case 'b': {
              event.preventDefault();
              const marks = Editor.marks(editor);
              marks?.bold ? Editor.removeMark(editor, 'bold') : Editor.addMark(editor, 'bold', true);
              break;
            }
            case 'i': {
              event.preventDefault();
              const marks = Editor.marks(editor);
              marks?.italic ? Editor.removeMark(editor, 'italic') : Editor.addMark(editor, 'italic', true);
              break;
            }
            case 'u': { // Added Underline Shortcut (Ctrl+U)
              event.preventDefault();
              const marks = Editor.marks(editor);
              marks?.underline ? Editor.removeMark(editor, 'underline') : Editor.addMark(editor, 'underline', true);
              break;
            }
            case '`': {
              event.preventDefault();
              const marks = Editor.marks(editor);
              marks?.code ? Editor.removeMark(editor, 'code') : Editor.addMark(editor, 'code', true);
              break;
            }
          }
        }}
      />
    </Slate>
  );
};

export default TextBlockContent;