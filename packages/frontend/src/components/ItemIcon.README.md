# ItemIcon Component

A React component for displaying Albion Online item icons with quality and enchantment support.

## Features

- **Smart URL Generation**: Uses the shared `generateItemIconUrl` utility
- **Size Presets**: Convenient preset sizes (small, medium, large, hero)  
- **Quality Levels**: Support for 1-5 quality levels
- **Enchantment**: Support for 0-3 enchantment levels with smart parsing
- **Error Handling**: Graceful fallback when icons fail to load
- **Accessibility**: Full ARIA support and keyboard navigation
- **Interactive**: Optional click handlers with visual feedback
- **Performance**: Lazy loading by default
- **TypeScript**: Full type safety

## Props

```typescript
interface ItemIconProps {
  itemId: string;           // Required: Item ID (may contain @X)
  quality?: number;         // Optional: 1-5 (overrides default)
  enchantment?: number;     // Optional: 0-3 (overrides @X in itemId)
  size?: number | 'small' | 'medium' | 'large' | 'hero'; // Optional
  alt?: string;            // Optional: Alt text (defaults to itemId)
  className?: string;      // Optional: CSS classes
  loading?: 'lazy' | 'eager'; // Optional: Loading behavior
  onError?: (error: Event) => void; // Optional: Error handler
  onClick?: () => void;    // Optional: Click handler
}
```

## Size Presets

- `small` = 32px (for list views, inventory grids)
- `medium` = 64px (for cards, item details) 
- `large` = 128px (for detailed views, modals)
- `hero` = 217px (for main item displays, hero sections)

## Usage Examples

### Basic Usage
```tsx
import { ItemIcon } from './components/ItemIcon';

// Simple item icon
<ItemIcon itemId="T4_BAG" />

// With quality
<ItemIcon itemId="T5_SWORD" quality={3} />

// With enchantment
<ItemIcon itemId="T8_ARMOR_CLOTH_SET1@3" />
```

### Size Variants
```tsx
// Preset sizes
<ItemIcon itemId="T4_BAG" size="small" />
<ItemIcon itemId="T4_BAG" size="medium" />
<ItemIcon itemId="T4_BAG" size="large" />
<ItemIcon itemId="T4_BAG" size="hero" />

// Custom size
<ItemIcon itemId="T4_BAG" size={96} />
```

### Interactive Icons
```tsx
// Clickable icon
<ItemIcon 
  itemId="T6_POTION_HEAL" 
  size="large" 
  onClick={() => showItemDetails('T6_POTION_HEAL')}
/>

// With error handling
<ItemIcon 
  itemId="T7_MOUNT_HORSE" 
  onError={(e) => console.error('Icon failed:', e)}
/>
```

### Advanced Usage
```tsx
// Full configuration
<ItemIcon 
  itemId="T8_ARMOR_PLATE_SET1@2"
  quality={5}
  enchantment={3}  // Overrides the @2 in itemId
  size="hero"
  className="my-custom-class"
  alt="Masterpiece T8 Plate Armor @3"
  loading="eager"
  onClick={() => handleItemClick()}
  onError={(e) => handleIconError(e)}
/>
```

### Item ID Formats

The component supports various Albion Online item ID formats:

```tsx
// Basic item IDs
<ItemIcon itemId="T4_BAG" />
<ItemIcon itemId="T5_SWORD" />
<ItemIcon itemId="T6_POTION_HEAL" />

// Items with enchantment in ID
<ItemIcon itemId="T8_ARMOR_CLOTH_SET1@1" />
<ItemIcon itemId="T7_MOUNT_HORSE@3" />

// Enchantment override (overrides @X in itemId)
<ItemIcon itemId="T8_ARMOR_CLOTH_SET1@1" enchantment={3} />
```

## CSS Classes

The component applies the following classes:

- `.item-icon` - Base class for all icons
- `.item-icon--clickable` - Added when `onClick` is provided
- `.item-icon--error` - Added when icon fails to load

## Styling

Default styles are provided in `ItemIcon.css`. You can override them or add custom styles:

```css
/* Custom styling example */
.my-custom-icon {
  border: 2px solid gold;
  border-radius: 8px;
}

.my-custom-icon:hover {
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}
```

## Error Handling

When an icon fails to load:

1. A fallback placeholder is shown
2. The `onError` callback is called (if provided)
3. The `.item-icon--error` class is applied
4. The fallback shows a "?" symbol with appropriate styling

## Performance

- **Lazy Loading**: Images load only when entering viewport (default)
- **Eager Loading**: Use `loading="eager"` for above-the-fold content
- **Caching**: Albion's CDN provides efficient caching
- **Optimized Rendering**: Minimal re-renders with React.memo patterns

## Accessibility

- Proper `alt` text generation
- ARIA labels for interactive icons
- Keyboard navigation support (Enter/Space for clicks)
- Screen reader friendly error states
- Semantic HTML structure

## Integration with Shared Utils

The component leverages utilities from `@alb-market/shared`:

```typescript
import { generateItemIconUrl, IconPresets } from '@alb-market/shared';

// Used internally by the component
const iconUrl = generateItemIconUrl(itemId, { quality, enchantment, size });
```

## Demo

Visit `/icons` in the development server to see a comprehensive demo of all features.