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
import ContextMenu from './ContextMenu';
import { ArchiveActionsPopup } from './ArchiveActionsPopup';
// [ADDED] Import Search component
import Search from '../Header/SearchBar';

type receivedProps = { filesPath: string; root: SetStateAction<TreeItemsObj> };
declare global {
  interface Window {
    api: any;
  }
}
function FileSystem() {
  const { t } = useTranslation();
  // [ADDED] Destructure searchQuery for filtering
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
  const [selectedDirectory, setSelectedDirectory] =
    useState<TreeItemIndex>('root');
  const [focusedItem, setFocusedItem] = useState<TreeItemIndex>(-1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TreeItemIndex } | null>(null);
  
  const [isArchiveModeActive, setArchiveModeActive] = useState(false);
  const [archiveSelection, setArchiveSelection] = useState<TreeItemIndex[]>([]);

  const fetchNotebooks = useCallback(() => {
    window.api.getNotebooks();
  }, []);

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  useEffect(() => {
    window.api.receive('gotNotebooks', (data: receivedProps) => {
      setItems(data.root);
    });
  }, []);

  useEffect(() => {
    const cleanup = window.api.onNotebooksRefresh(() => {
        fetchNotebooks();
    });

    return () => {
        cleanup();
    };
  }, [fetchNotebooks]);

  // [ADDED] Search Logic: Filter items based on searchQuery
  const displayedItems = useMemo(() => {
    if (!searchQuery) return items;

    const lowerQuery = searchQuery.toLowerCase();
    const includedIds = new Set<string>();

    const traverse = (itemId: string): boolean => {
      const item = items[itemId];
      if (!item) return false;

      let hasMatchingChild = false;
      if (item.children) {
        item.children.forEach((childId) => {
           if (traverse(childId as string)) {
             hasMatchingChild = true;
           }
        });
      }

      const matches = item.data.toLowerCase().includes(lowerQuery);
      const shouldKeep = matches || hasMatchingChild || itemId === 'root';

      if (shouldKeep) {
        includedIds.add(itemId);
      }
      return shouldKeep;
    };

    traverse('root');

    const newItems: TreeItemsObj = {};
    includedIds.forEach(id => {
      const original = items[id];
      const newChildren = original.children
        ? original.children.filter(childId => includedIds.has(childId as string))
        : [];
      newItems[id] = { ...original, children: newChildren };
    });

    return newItems;
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
    if (itemExistsInParent(newFileName, selectedDirectory, items, false)) {
      setErrorModalContent(t('Modal 2'));
      setErrorModalOpen(true);
      return;
    }
    setItems((prev) => generateStateWithNewFile(prev, selectedDirectory));
  };

  const handleRenameItem = (item: MathTreeItem, name: string): void => {
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
        let newPath: string;
        const oldPath = item.index;

        if (item.isFolder) {
          const split = item.path.split('\\');
          split.pop();
          split.push(name);
          newPath = split.join('\\');
        } else {
          const index = item.path.length - (item.data + '.json').length;
          const dirName = item.path.slice(0, index);
          newPath = dirName + name + '.json';
        }

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

  const handleArchiveItem = async () => {
    if (!contextMenu) return;
    const itemToArchive = items[contextMenu.item];
    if (!itemToArchive) return;

    const result = await window.api.archiveItem(itemToArchive.path);
    if (result.success) {
      setItems(prev => {
        const newItems = { ...prev };
        const itemToDelete = contextMenu.item;

        const parent = getParent(newItems, itemToDelete);
        if (parent) {
          newItems[parent.index] = {
            ...parent,
            children: parent.children.filter(child => child !== itemToDelete),
          };
        }

        const itemsToDelete = [itemToDelete];
        const queue = [...(newItems[itemToDelete]?.children ?? [])];
        while (queue.length > 0) {
          const currentItem = queue.shift();
          if (currentItem) {
            itemsToDelete.push(currentItem);
            const children = newItems[currentItem]?.children;
            if (children) {
              queue.push(...children);
            }
          }
        }
        
        for (const item of itemsToDelete) {
            delete newItems[item];
        }

        return newItems;
      });
      window.api.requestNotebooksRefresh(); 
    }
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if(isArchiveModeActive) return; 

    const target = e.target as HTMLElement;
    const itemElement = target.closest('[data-rct-item-id]');
    if (itemElement) {
        const itemId = itemElement.getAttribute('data-rct-item-id');
        if (itemId && itemId !== 'root') {
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                item: itemId,
            });
        }
    }
  };

  const toggleArchiveSelectItem = (itemId: TreeItemIndex) => {
    setArchiveSelection(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCancelArchiveMode = () => {
    setArchiveModeActive(false);
    setArchiveSelection([]);
  };

  const handleArchiveSelectAll = () => {
    const allItemIds = Object.keys(items).filter(id => id !== 'root');
    setArchiveSelection(allItemIds);
  };

  const handleArchiveConfirm = async () => {
    if (archiveSelection.length === 0) return;

    const pathsToArchive = archiveSelection.map(id => items[id]?.path).filter(Boolean);
    if (pathsToArchive.length === 0) return;

    const result = await window.api.archiveNotebooks(pathsToArchive); 

    if (result.success) {
      setItems(prev => {
        const newItems = { ...prev };
        const allItemsToDelete = new Set<TreeItemIndex>();

        archiveSelection.forEach(itemToArchiveId => {
          if (!newItems[itemToArchiveId]) return;

          const parent = getParent(newItems, itemToArchiveId);
          if (parent) {
            newItems[parent.index] = {
              ...parent,
              children: parent.children.filter(child => child !== itemToArchiveId),
            };
          }

          const queue = [itemToArchiveId];
          while (queue.length > 0) {
            const currentItem = queue.shift();
            if (currentItem) {
              allItemsToDelete.add(currentItem);
              const children = newItems[currentItem]?.children;
              if (children) {
                queue.push(...children);
              }
            }
          }
        });

        allItemsToDelete.forEach(id => {
          delete newItems[id];
        });

        return newItems;
      });

      window.api.requestNotebooksRefresh(); 
    }
    handleCancelArchiveMode();
  };

  return (
    <div className='file-system' onKeyUp={handleDeleteItem}>
      <div className='file-system-header'>
        <span
          data-tooltip={t('Notebooks Tooltip')}
          className='file-system-header-title'
          onDoubleClick={() => window.api.openFiles()}
        >
          {t('My Notebooks')}
        </span>
        <div className='file-system-header-buttons'>
          {!isArchiveModeActive ? (
            <>
              <button onClick={() => setArchiveModeActive(true)} data-tooltip={t('Archive Items')}>
                <i className='fi fi-rr-archive' />
              </button>
              <button onClick={addFolder} data-tooltip={t('New Folder')}>
                <i className='fi fi-rr-add-folder' />
              </button>
              <button onClick={addFile} data-tooltip={t('New File')}>
                <i className='fi-rr-add-document' />
              </button>
            </>
          ) : (
            <button onClick={handleCancelArchiveMode} data-tooltip={t('Cancel')}>
               <i className='fi fi-rr-cross-small' />
            </button>
          )}
        </div>
      </div>
      
      {/* [ADDED] Search Bar placed here */}
      <div style={{ padding: '0 10px 10px 10px' }}>
          <Search />
      </div>

      <div className='files-tree-container' onClick={handleClickedOutsideItem} onContextMenu={handleContextMenu}>
        <ControlledTreeEnvironment
          items={displayedItems} // [CHANGED] Use displayedItems for filtering
          canDragAndDrop={!isArchiveModeActive && !searchQuery}
          canReorderItems={!isArchiveModeActive && !searchQuery}
          canDropOnFolder={!isArchiveModeActive}
          canDropOnNonFolder={!isArchiveModeActive}
          getItemTitle={(item) => item.data}
          canSearch={false}
          keyboardBindings={{ renameItem: ['shift+R'] }}
          viewState={{
            ['fileSystem']: {
              focusedItem,
              expandedItems,
              selectedItems: isArchiveModeActive ? [] : selectedItems, 
            },
          }}
          onDrop={handleOnDrop}
          onFocusItem={(item) => {
            const mathTreeItem = item as MathTreeItem;
            setFocusedItem(mathTreeItem.index);
            if (!isArchiveModeActive) {
              item.isFolder
                ? setSelectedDirectory(mathTreeItem.index)
                : setSelectedFile(mathTreeItem.path);
            }
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
          onSelectItems={isArchiveModeActive ? () => {} : setSelectedItems}
          onRenameItem={handleRenameItem}
          renderItemTitle={({ title, item }) => (
            <div className="rct-tree-item-title">
              {isArchiveModeActive && item.index !== 'root' && (
                <input
                  type="checkbox"
                  className="item-checkbox"
                  checked={archiveSelection.includes(item.index)}
                  onChange={() => toggleArchiveSelectItem(item.index)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {title}
            </div>
          )}
        >
          <Tree treeId='fileSystem' rootItem='root' treeLabel='File System' />
        </ControlledTreeEnvironment>
        <div>
          <p className='instruction-p'>
            {t('Press')} <span className='button-text'>Delete</span>{' '}
            {t('Delete Item')}
          </p>
          <p className='instruction-p'>
            {t('Press')} <span className='button-text'>Shift+R</span>{' '}
            {t('Rename Item')}
          </p>
        </div>
      </div>
      <ErrorModal
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
      >
        {errorModalContent}
      </ErrorModal>

      {contextMenu && (
        <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onArchive={handleArchiveItem}
            onClose={() => setContextMenu(null)}
        />
      )}

      {isArchiveModeActive && (
        <ArchiveActionsPopup
          selectionCount={archiveSelection.length}
          onSelectAll={handleArchiveSelectAll}
          onArchive={handleArchiveConfirm}
          onCancel={handleCancelArchiveMode}
        />
      )}
    </div>
  );
}

export default FileSystem;