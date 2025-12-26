import React from 'react';
import { useGeneralContext } from '@components/GeneralContext';
import './SearchBar.scss';

const Search = () => {
  const { searchQuery, setSearchQuery } = useGeneralContext();

  return (
    <div className="search-bar-container">
      <div className="search-box">
        <i className="fi fi-rr-search" />
        <input
          className="search-input"
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <i 
            className="fi fi-rr-cross-small clear-icon" 
            onClick={() => setSearchQuery('')} 
          />
        )}
      </div>
    </div>
  );
};

export default Search;