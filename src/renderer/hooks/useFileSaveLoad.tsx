import { useGeneralContext } from '@components/GeneralContext';
import { useEffect, useRef } from 'react';
import { triggerPopupAnimation } from '@components/common/Notification';
import {
  BlockElement,
  FileStructure,
  PageGridState,
  BlockState,
} from '@renderer/common/types';

export function useFileSaveLoad(
  state: PageGridState,
  setStateFunction: (...args: unknown[]) => unknown,
  allBlockValues: BlockState[],
  setAllBlockValues: (...args: unknown[]) => unknown,
  setPopupType: (args: string) => void,
) {
  const emptyArray: BlockElement[] = [];
  const { selectedFile, saveRequest, currentFileTags, setCurrentFileTags } =
    useGeneralContext();

  // --- REFS FOR SAFETY (Prevents Stale Data) ---
  // We use refs to hold the data because 'useEffect' closures can sometimes
  // hold onto old versions of variables. Refs are always up-to-date.
  const stateRef = useRef(state);
  const valuesRef = useRef(allBlockValues);
  const tagsRef = useRef(currentFileTags);
  const isFileLoadedRef = useRef(false); // <--- CRITICAL GUARD

  // Keep Refs Synced with State
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { valuesRef.current = allBlockValues; }, [allBlockValues]);
  useEffect(() => { tagsRef.current = currentFileTags; }, [currentFileTags]);

  const setEmptyPage = () => {
    setStateFunction((prev: { items: BlockElement[] }) => ({
      ...prev,
      items: emptyArray,
    }));
  };

  // --- 1. LOAD FILE LOGIC ---
  useEffect(
    function loadFile() {
      // 1. Mark file as NOT loaded immediately when path changes.
      // This locks the save function so we can't accidentally save an empty page.
      isFileLoadedRef.current = false;

      if (selectedFile) window.api.loadX(selectedFile);
      
      const handleLoadedData = (data: string) => {
        if (!data) {
          setEmptyPage();
          // Even if empty, we consider it "loaded" so we can start writing
          isFileLoadedRef.current = true; 
          return;
        }

        try {
            const parsedData = JSON.parse(data);
            const blocksData: BlockElement[] = parsedData.blocks;

            setCurrentFileTags(parsedData.tags || []);

            if (!Array.isArray(blocksData)) {
              setEmptyPage();
              isFileLoadedRef.current = true;
              return;
            }

            blocksData.map((block: BlockElement) => {
              if (block.y == null) block.y = Infinity;
              if (block.x == null) block.x = Infinity;
            });

            setStateFunction((prev: { items: BlockElement[] }) => ({
              ...prev,
              items: blocksData,
            }));

            // Reconstruct block values
            let newData: object[] = blocksData;
            newData = newData.map((block: BlockElement) => {
              return { id: block.i, metaData: block.metaData };
            });

            setAllBlockValues(newData);
            
            // 2. UNLOCK SAVING: Data is now safe on screen.
            isFileLoadedRef.current = true;

        } catch (e) {
            console.error("File parse error:", e);
            setEmptyPage();
            isFileLoadedRef.current = true;
        }
      };

      const removeListener = window.api.receive('gotLoadedDataX', handleLoadedData);

      return () => {
        if (removeListener) removeListener();
      };
    },
    [selectedFile],
  );

  // --- 2. SAVE FILE LOGIC ---
  useEffect(
    function saveFile() {
      if (saveRequest?.cmd === 'save') {
        if (selectedFile) {
          // GUARD: Do NOT save if the file hasn't finished loading yet.
          // This prevents the "Rename/Tag" race condition where it saves 
          // while the page is still clearing/transitioning.
          if (!isFileLoadedRef.current) {
            console.warn("Save blocked: File is still loading or in transition.");
            return;
          }

          try {
            saveGridDataToFile();
            triggerPopupAnimation('save', setPopupType);
          } catch (error) {
            triggerPopupAnimation('error', setPopupType);
            console.error(error);
          }
        } else triggerPopupAnimation('firstSelect', setPopupType);
      }
    },
    [saveRequest],
  );

  const saveMetaDataPerBlock = (block: BlockElement) => {
    // Read from REF to ensure we get the absolute latest values
    const foundBlock = valuesRef.current.find(blockState => blockState.id == block.i);
    
    if (foundBlock && foundBlock.metaData) {
        block.metaData = {
          ...foundBlock.metaData, 
          blockStateFunction: () => null,
        };
    }
  };

  const saveGridDataToFile = () => {
    // Read from REF to ensure we get the absolute latest items
    // Deep clone to prevent state mutation
    const currentItemsCopy: BlockElement[] = JSON.parse(JSON.stringify(stateRef.current.items));
    
    currentItemsCopy.map(saveMetaDataPerBlock);

    const fileData: FileStructure = {
      blocks: currentItemsCopy,
      tags: tagsRef.current, // Use Ref for tags too
      mathMemory: {},
    };

    window.api.saveX(JSON.stringify(fileData), selectedFile);
  };
}