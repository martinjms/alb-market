import React from 'react';
import { ItemIcon } from './ItemIcon';

/**
 * Demo component showing various ItemIcon usage examples
 * This can be used for testing and documentation purposes
 */
export const ItemIconDemo: React.FC = () => {
  const handleItemClick = (itemId: string) => {
    console.log(`Clicked on item: ${itemId}`);
  };

  const handleIconError = (error: Event) => {
    console.error('Icon failed to load:', error);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>ItemIcon Component Demo</h1>
      
      {/* Size Presets */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Size Presets</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon itemId="T4_BAG" size="small" />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>small (32px)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon itemId="T4_BAG" size="medium" />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>medium (64px)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon itemId="T4_BAG" size="large" />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>large (128px)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon itemId="T4_BAG" size="hero" />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>hero (217px)</p>
          </div>
        </div>
      </section>

      {/* Quality Levels */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Quality Levels</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map(quality => (
            <div key={quality} style={{ textAlign: 'center' }}>
              <ItemIcon itemId="T5_SWORD" quality={quality} size="medium" />
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>Quality {quality}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Enchantment Levels */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Enchantment Levels</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[0, 1, 2, 3].map(enchantment => (
            <div key={enchantment} style={{ textAlign: 'center' }}>
              <ItemIcon 
                itemId="T8_ARMOR_CLOTH_SET1" 
                enchantment={enchantment} 
                quality={3}
                size="medium" 
              />
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>
                @{enchantment}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Clickable Icons */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Interactive Icons</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon 
              itemId="T6_POTION_HEAL" 
              size="large" 
              onClick={() => handleItemClick('T6_POTION_HEAL')}
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>Clickable</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon 
              itemId="T7_MOUNT_HORSE" 
              size="large" 
              quality={4}
              enchantment={2}
              onClick={() => handleItemClick('T7_MOUNT_HORSE@2')}
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>High Quality + Click</p>
          </div>
        </div>
      </section>

      {/* Custom Size */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Custom Size</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon itemId="T4_TOOL_PICKAXE" size={48} />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>48px</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon itemId="T4_TOOL_PICKAXE" size={96} />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>96px</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon itemId="T4_TOOL_PICKAXE" size={150} />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>150px</p>
          </div>
        </div>
      </section>

      {/* Error Handling */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Error Handling</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon 
              itemId="INVALID_ITEM_ID" 
              size="medium"
              onError={handleIconError}
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>Invalid Item ID</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ItemIcon 
              itemId="ANOTHER_BAD_ID" 
              size="large"
              onClick={() => handleItemClick('ANOTHER_BAD_ID')}
              onError={handleIconError}
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>Clickable Error State</p>
          </div>
        </div>
      </section>

      {/* Real Albion Items */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Popular Albion Items</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            'T4_BAG',
            'T5_SWORD',
            'T6_ARMOR_LEATHER_SET1@1',
            'T7_ARMOR_CLOTH_SET1@2',
            'T8_ARMOR_PLATE_SET1@3',
            'T6_POTION_HEAL',
            'T4_MOUNT_HORSE',
            'T8_TOOL_PICKAXE_AVALON@1'
          ].map(itemId => (
            <div key={itemId} style={{ textAlign: 'center' }}>
              <ItemIcon 
                itemId={itemId} 
                size="medium" 
                quality={2}
                onClick={() => handleItemClick(itemId)}
              />
              <p style={{ 
                margin: '0.5rem 0 0 0', 
                fontSize: '0.75rem', 
                color: '#666',
                maxWidth: '80px',
                wordBreak: 'break-all'
              }}>
                {itemId}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ItemIconDemo;