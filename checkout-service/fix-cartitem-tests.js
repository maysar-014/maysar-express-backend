#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need to be updated
const testFiles = [
  'src/domain/value-objects/__tests__/cart.value-object.test.ts',
  'src/domain/value-objects/__tests__/cart.value-object.unit.test.ts'
];

function fixCartItemConstructors() {
  testFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace new CartItem({...}) with CartItem.fromObject({...})
    const updatedContent = content.replace(
      /new CartItem\(\s*\{([^}]+)\}\s*\)/g,
      'CartItem.fromObject({$1})'
    );

    if (content !== updatedContent) {
      fs.writeFileSync(fullPath, updatedContent);
      console.log(`Fixed CartItem constructors in: ${filePath}`);
    } else {
      console.log(`No changes needed in: ${filePath}`);
    }
  });
}

fixCartItemConstructors();
console.log('CartItem constructor fixes completed!');