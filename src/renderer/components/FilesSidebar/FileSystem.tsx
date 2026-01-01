/* eslint-disable import/named */
import ErrorModal from '@components/common/Modals/ErrorModal';
import { useGeneralContext } from '@components/GeneralContext';
import React, { SetStateAction, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Tree,
  ControlledTreeEnvironment,
  DraggingPositionItem,
  TreeItem,
  DraggingPositionBetweenItems,
  TreeItemIndex,
} from 'react-complex-tree';
import './FileSystem.scss';
import {
  draggedToTheSameParent,
  updateItemsPosition,
  changeItemPath,
  generateStateWithNewFolder,
  newFolderName,
  generateStateWithNewFile,
  newFileName,
  itemExistsInParent,
  getFileNameFromPath,
  deleteItemFromItsPreviousParent,
  getParent,
} from './FileSystemHelpers';
import { MathTreeItem, TreeItemsObj } from './types';
import { useTranslation } from 'react-i18next';
import Search from '../Header/SearchBar';

type receivedProps = { filesPath: string; root: SetStateAction<TreeItemsObj> };

// ✅ Fixed: Complete Interface with ALL used methods
interface IElectronAPI {
  // Navigation & Files
  getNotebooks: () => void;
  openFiles: () => void;
  delete: (path: TreeItemIndex, isFolder?: boolean) => void;
  move: (oldPath: string, newPath: string) => void;
  newFile: (path: string) => void;
  newFolder: (path: string) => void;
  saveX: (data: string, filePath: string) => void;
  loadX: (filePath: string) => void;
  createNewNotebook: () => Promise<string>;

  // System & Utils
  getOS: () => void;
  getAIResponse: (prompt: string) => Promise<string>;

  // IPC Communication
  send: (channel: string, data?: unknown) => void;
  receive: (channel: string, func: (...args: unknown[]) => void) => (() => void) | undefined;

  // Listeners
  onNotebooksRefresh: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

function FileSystem() {
  const { t } = useTranslation();
  const { setSelectedFile, searchQuery } = useGeneralContext();

  const [items, setItems] = useState<TreeItemsObj>({
    root: {
      index: 'root',
      data: '',
      path: '',
    },
  });

  const [errorModalContent, setErrorModalContent] = useState('');
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState<TreeItemIndex>('root');
  const [focusedItem, setFocusedItem] = useState<TreeItemIndex>(-1);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const fetchNotebooks = useCallback(() => {
    window.api.getNotebooks();
  }, []);

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  useEffect(() => {
    const removeListener = window.api.receive('gotNotebooks', (data: unknown) => {
      setItems((data as receivedProps).root);
    });

    return () => {
      if (typeof removeListener === 'function') {
        removeListener();
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = window.api.onNotebooksRefresh(() => {
      fetchNotebooks();
    });

    return () => {
      cleanup();
    };
  }, [fetchNotebooks]);

  // --- SORTING LOGIC ---
  const displayedItems = useMemo(() => {
    const rawItems = { ...items };

    const sortTree = (itemsMap: TreeItemsObj) => {
      const sortedMap = { ...itemsMap };

      Object.keys(sortedMap).forEach((key) => {
        const item = sortedMap[key];

        if (item.children && item.children.length > 0) {
          const folders = item.children.filter(childId => sortedMap[childId]?.isFolder);
          const files = item.children.filter(childId => !sortedMap[childId]?.isFolder);

          const alphaSort = (a: string, b: string) => {
            const nameA = sortedMap[a]?.data?.toLowerCase() || '';
            const nameB = sortedMap[b]?.data?.toLowerCase() || '';
            return nameA.localeCompare(nameB);
          };

          folders.sort(alphaSort);
          files.sort(alphaSort);

          item.children = [...folders, ...files];
        }
      });
      return sortedMap;
    };

    const sortedItems = sortTree(rawItems);

    if (!searchQuery) return sortedItems;

    const lowerQuery = searchQuery.toLowerCase();
    const includedIds = new Set<string>();

    const traverse = (itemId: string): boolean => {
      const item = sortedItems[itemId];
      if (!item) return false;

      let hasMatchingChild = false;
      if (item.children) {
        item.children.forEach((childId) => {
          if (traverse(childId as string)) {
            hasMatchingChild = true;
          }
        });
      }

      const nameMatches = item.data.toLowerCase().includes(lowerQuery);
      const tagMatches = item.tags?.some((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );

      const matches = nameMatches || tagMatches;
      const shouldKeep = matches || hasMatchingChild || itemId === 'root';

      if (shouldKeep) {
        includedIds.add(itemId);
      }
      return shouldKeep;
    };

    traverse('root');

    const filteredItems: TreeItemsObj = {};
    includedIds.forEach(id => {
      const original = sortedItems[id];
      const newChildren = original.children
        ? original.children.filter(childId => includedIds.has(childId as string))
        : [];
      filteredItems[id] = { ...original, children: newChildren };
    });

    return filteredItems;
  }, [items, searchQuery]);

  const handleOnDrop = (
    draggedItems: TreeItem[],
    target: DraggingPositionItem | DraggingPositionBetweenItems,
  ) => {
    setItems((prev) => {
      const draggedItem = draggedItems[0];
      if (draggedToTheSameParent(prev, draggedItem, target)) return prev;
      let dest: TreeItemIndex = '';
      if (
        'targetItem' in target &&
        ((target as DraggingPositionItem | DraggingPositionBetweenItems)
          .targetType !== 'item' ||
          prev[target.targetItem].isFolder)
      ) {
        dest = target.targetItem;
      } else {
        dest = target.parentItem;
      }
      if (dest) {
        for (const item of items[dest].children) {
          if (
            getFileNameFromPath(item as string) === draggedItem.data &&
            items[item].isFolder === draggedItem.isFolder
          ) {
            setErrorModalContent(t('Modal 5'));
            setErrorModalOpen(true);
            return prev;
          }
        }
      }
      return updateItemsPosition(prev, draggedItem, target);
    });
  };

  const addFolder = () => {
    if (itemExistsInParent(newFolderName, selectedDirectory, items, true)) {
      setErrorModalContent(t('Modal 3'));
      setErrorModalOpen(true);
      return;
    }
    setItems((prev) => generateStateWithNewFolder(prev, selectedDirectory));
  };

  const addFile = () => {
    // 1. Check if file already exists
    if (itemExistsInParent(newFileName, selectedDirectory, items, false)) {
      setErrorModalContent(t('Modal 2'));
      setErrorModalOpen(true);
      return;
    }

    // --- ADD THIS BLOCK ---
    // 2. Construct the path of the new file manually
    // We replicate the logic from FileSystemHelpers to ensure the ID matches
    const parentItem = items[selectedDirectory];
    const newFilePath = parentItem.path + '\\' + newFileName + '.json';

    // 3. Auto-open the new file
    setSelectedFile(newFilePath);

    // 4. Focus the item in the tree (for keyboard navigation)
    setFocusedItem(newFilePath);
    // ----------------------

    // 5. Update the tree state
    setItems((prev) => generateStateWithNewFile(prev, selectedDirectory));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl + N (or Cmd + N on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault(); // CRITICAL: Stops the default "New Window" action
        addFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on unmount or re-render
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [addFile]);

  const handleRenameItem = (item: MathTreeItem, name: string): void => {
    const lastSeparatorIndex = Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\'));
    const dirName = lastSeparatorIndex !== -1 ? item.path.slice(0, lastSeparatorIndex + 1) : '';

    if (
      itemExistsInParent(
        name,
        getParent(items, item.index).index,
        items,
        item.isFolder,
      )
    ) {
      setErrorModalContent(t('Modal 4'));
      setErrorModalOpen(true);
    } else {
      setItems((prev) => {
        const newPath = item.isFolder
          ? `${dirName}${name}`
          : `${dirName}${name}.json`;

        const oldPath = item.index;

        let newItems = { ...prev };
        newItems = changeItemPath(newItems, item, newPath);

        for (const [, value] of Object.entries(newItems)) {
          const mathTreeItem = value as MathTreeItem;
          if (mathTreeItem.children.includes(oldPath)) {
            mathTreeItem.children = mathTreeItem.children.filter(
              (child) => child !== oldPath,
            );
            mathTreeItem.children.push(newPath);
          }
        }

        return newItems;
      });
    }
  };

  const handleClickedOutsideItem = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('rct-tree-items-container')) {
      setSelectedDirectory('root');
      setFocusedItem(-1);
      setSelectedItems([]);
      setExpandedItems([]);
    }
  };

  const handleDeleteItem = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Delete' && focusedItem != -1) {
      window.api.delete(focusedItem, items[focusedItem].isFolder);
      setItems((prev) => {
        const newItems = { ...prev };
        const item = newItems[focusedItem];
        deleteItemFromItsPreviousParent(newItems, item);
        if (item.isFolder) {
          for (const [key] of Object.entries(newItems)) {
            if (key.startsWith(focusedItem as string)) {
              delete newItems[key];
            }
          }
        }
        return newItems;
      });
      setFocusedItem(-1);
      setSelectedDirectory('root');
    }
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setCheckedItems((prev) => [...prev, id]);
    } else {
      setCheckedItems((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkDelete = () => {
    const newItems = { ...items };
    checkedItems.forEach((id) => {
      window.api.delete(id, false);
      const item = newItems[id];
      if (item) {
        deleteItemFromItsPreviousParent(newItems, item);
        delete newItems[id];
      }
    });

    setItems(newItems);
    setCheckedItems([]);
    setIsDeleteMode(false);
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setCheckedItems([]);
  };

  return (
    <div className={`file-system ${isDeleteMode ? 'delete-mode' : ''}`} onKeyUp={handleDeleteItem}>
      <div className='file-system-header'>
        <span
          data-tooltip={t('Notebooks Tooltip')}
          className='file-system-header-title'
          onDoubleClick={() => window.api.openFiles()}
        >
          {t('My Notebooks')}
        </span>

        <div className='file-system-header-buttons'>
          <button
            onClick={toggleDeleteMode}
            data-tooltip={isDeleteMode ? t('Cancel') : t('Delete Multiple')}
            className={isDeleteMode ? 'active-delete-mode' : ''}
          >
            <i className={`fi ${isDeleteMode ? 'fi-rr-cross-small' : 'fi-rr-trash'}`} />
          </button>

          <div className="separator"></div>

          {!isDeleteMode ? (
            <>
              <button onClick={addFolder} data-tooltip={t('New Folder')} className="action-btn">
                <i className='fi fi-rr-add-folder' />
              </button>
              <button onClick={addFile} data-tooltip={t('New File')} className="action-btn">
                <i className='fi fi-rr-add-document' />
              </button>
            </>
          ) : (
            <button
              onClick={handleBulkDelete}
              data-tooltip={t('Confirm Delete')}
              className="confirm-delete-btn"
              disabled={checkedItems.length === 0}
            >
              <i className="fi fi-rr-check" />
              {checkedItems.length > 0 && <span className="count-badge">{checkedItems.length}</span>}
            </button>
          )}
        </div>
      </div>

      <div>
        <Search />
      </div>

      <div className='files-tree-container' onClick={handleClickedOutsideItem}>
        <ControlledTreeEnvironment
          items={displayedItems}
          canDragAndDrop={!searchQuery && !isDeleteMode}
          canReorderItems={!searchQuery && !isDeleteMode}
          canDropOnFolder={true}
          canDropOnNonFolder={true}
          getItemTitle={(item) => item.data}
          renderItemArrow={() => null}
          canSearch={false}
          keyboardBindings={{ renameItem: ['shift+R'] }}
          viewState={{
            ['fileSystem']: {
              focusedItem,
              expandedItems,
              selectedItems: selectedItems,
            },
          }}
          onDrop={handleOnDrop}
          onFocusItem={(item) => {
            const mathTreeItem = item as MathTreeItem;
            setFocusedItem(mathTreeItem.index);
            item.isFolder
              ? setSelectedDirectory(mathTreeItem.index)
              : setSelectedFile(mathTreeItem.path);
          }}
          onExpandItem={(item) =>
            setExpandedItems([...expandedItems, item.index])
          }
          onCollapseItem={(item) =>
            setExpandedItems(
              expandedItems.filter(
                (expandedItemIndex) => expandedItemIndex !== item.index,
              ),
            )
          }
          onSelectItems={setSelectedItems}
          onRenameItem={handleRenameItem}
          renderItemTitle={({ title, item }) => (
            <div className="rct-tree-item-title">
              {!item.isFolder && (
                <input
                  type="checkbox"
                  className="delete-checkbox"
                  checked={checkedItems.includes(item.index as string)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleCheckboxChange(item.index as string, e.target.checked)}
                />
              )}
              <span className="file-item-text">{title}</span>
            </div>
          )}
        >
          <Tree treeId='fileSystem' rootItem='root' treeLabel='File System' />
        </ControlledTreeEnvironment>
      </div>

      <div className='file-system-footer'>
        <div className='footer-instruction'>
          <span>{t('Delete')}</span>
          <kbd>Del</kbd>
        </div>
        <div className='footer-instruction'>
          <span>{t('Rename')}</span>
          <kbd>Shift+R</kbd>
        </div>
      </div>

      <ErrorModal
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
      >
        {errorModalContent}
      </ErrorModal>
    </div>
  );
}

export default FileSystem;