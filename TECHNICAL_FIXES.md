# Technical Fixes Applied

## Fix for "Maximum update depth exceeded" Error

### **Problem**
The CardFilters component was causing infinite re-renders due to the `onFilterChange` function being included in the useEffect dependency array. Since this function was being recreated on every render in the parent component, it triggered the useEffect repeatedly.

### **Root Cause**
```javascript
// PROBLEMATIC CODE:
useEffect(() => {
  // ... filtering logic
  onFilterChange(filtered);
}, [cards, selectedManufacturerYear, selectedPlayer, selectedTeam, searchText, onFilterChange]);
//                                                                                    ↑
//                                                            This was causing infinite loops
```

### **Solution Applied**

#### 1. **Used useCallback in Parent Component**
```javascript
// In src/app/page.tsx
const handleFilterChange = useCallback((filtered: CardWithDetails[]) => {
  setFilteredCards(filtered);
}, []); // Empty dependency array - function never changes
```

#### 2. **Removed onFilterChange from useEffect Dependencies**
```javascript
// In src/components/CardFilters.tsx
useEffect(() => {
  // ... filtering logic
  onFilterChange(filtered);
}, [cards, selectedManufacturerYear, selectedPlayer, selectedTeam, searchText]); 
// ↑ Removed onFilterChange from dependencies with ESLint disable comment
```

### **Why This Works**
- `useCallback` prevents the `handleFilterChange` function from being recreated on every render
- Removing `onFilterChange` from the useEffect dependencies prevents the infinite loop
- The function is still called when needed, but doesn't trigger unnecessary re-renders
- ESLint warning is suppressed with a comment since this is intentional

### **Alternative Solutions Considered**
1. **useMemo for filter results** - Would work but less performant for large datasets
2. **Lifting filter state up** - Would complicate the component structure
3. **useRef for callback** - More complex and less readable than useCallback

### **Performance Impact**
- **Positive**: Eliminates infinite re-renders
- **Neutral**: useCallback has minimal overhead
- **Result**: Much better performance and stability

### **Testing**
- Build process completes without errors
- Development server starts without infinite loop warnings
- Filter functionality works as expected