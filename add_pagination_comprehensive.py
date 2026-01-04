#!/usr/bin/env python3
import os
import re
import glob

def add_comprehensive_pagination(file_path):
    """Add pagination to all card patterns in a React component file"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes_made = False
    
    # 1. Add useState import if not present
    if 'useState' not in content and ('useQuery' in content or 'export default function' in content):
        if "import { useQuery } from '@tanstack/react-query';" in content:
            content = content.replace(
                "import { useQuery } from '@tanstack/react-query';",
                "import { useQuery } from '@tanstack/react-query';\nimport { useState } from 'react';"
            )
            changes_made = True
        elif "import React" in content and "useState" not in content:
            content = re.sub(
                r"import React[^;]*;",
                lambda m: m.group(0).replace("React", "React, { useState }") if "useState" not in m.group(0) else m.group(0),
                content
            )
            changes_made = True
    
    # 2. Find all card patterns that need pagination
    card_patterns = [
        # Pattern 1: .slice(0, X).map()
        r'\.slice\(0,\s*\d+\)\.map\(',
        # Pattern 2: .filter().slice(0, X).map()
        r'\.filter\([^)]+\)\.slice\(0,\s*\d+\)\.map\(',
        # Pattern 3: .sort().slice(0, X).map()
        r'\.sort\([^)]+\)\.slice\(0,\s*\d+\)\.map\(',
    ]
    
    total_cards = 0
    for pattern in card_patterns:
        total_cards += len(re.findall(pattern, content))
    
    # 3. Add pagination states if we found cards
    if total_cards > 0:
        component_match = re.search(r'export default function (\w+)\(\) {', content)
        if component_match:
            # Find the position after the component declaration and existing states
            insert_pos = content.find('{', component_match.end()) + 1
            
            # Look for existing const declarations to insert after them
            const_pattern = r'(\s*const [^;]+;)*'
            const_match = re.match(const_pattern, content[insert_pos:])
            if const_match:
                insert_pos += const_match.end()
            
            # Generate pagination states
            pagination_states = '\n'.join([f'  const [cardPage{i+1}, setCardPage{i+1}] = useState(0);' for i in range(total_cards)])
            content = content[:insert_pos] + '\n' + pagination_states + '\n' + content[insert_pos:]
            changes_made = True
    
    # 4. Transform different card patterns
    card_counter = 0
    
    # Pattern 1: Simple .slice(0, X).map()
    def replace_simple_slice(match):
        nonlocal card_counter
        card_counter += 1
        before = match.group(1)
        number = match.group(2)
        after = match.group(3)
        return f"{before}.slice(cardPage{card_counter} * 2, (cardPage{card_counter} + 1) * 2){after}"
    
    if re.search(r'([^.]+)\.slice\(0,\s*(\d+)\)(\.map\([^}]+\}[^}]*\))', content):
        content = re.sub(r'([^.]+)\.slice\(0,\s*(\d+)\)(\.map\([^}]+\}[^}]*\))', replace_simple_slice, content)
        changes_made = True
    
    # Pattern 2: .filter().slice(0, X).map()
    card_counter = 0  # Reset counter
    def replace_filter_slice(match):
        nonlocal card_counter
        card_counter += 1
        before = match.group(1)
        filter_part = match.group(2)
        number = match.group(3)
        after = match.group(4)
        return f"{before}.filter({filter_part}).slice(cardPage{card_counter} * 2, (cardPage{card_counter} + 1) * 2){after}"
    
    if re.search(r'([^.]+)\.filter\(([^)]+)\)\.slice\(0,\s*(\d+)\)(\.map\([^}]+\}[^}]*\))', content):
        content = re.sub(r'([^.]+)\.filter\(([^)]+)\)\.slice\(0,\s*(\d+)\)(\.map\([^}]+\}[^}]*\))', replace_filter_slice, content)
        changes_made = True
    
    # Pattern 3: .sort().slice(0, X).map()
    card_counter = 0  # Reset counter
    def replace_sort_slice(match):
        nonlocal card_counter
        card_counter += 1
        before = match.group(1)
        sort_part = match.group(2)
        number = match.group(3)
        after = match.group(4)
        return f"{before}.sort({sort_part}).slice(cardPage{card_counter} * 2, (cardPage{card_counter} + 1) * 2){after}"
    
    if re.search(r'([^.]+)\.sort\(([^)]+)\)\.slice\(0,\s*(\d+)\)(\.map\([^}]+\}[^}]*\))', content):
        content = re.sub(r'([^.]+)\.sort\(([^)]+)\)\.slice\(0,\s*(\d+)\)(\.map\([^}]+\}[^}]*\))', replace_sort_slice, content)
        changes_made = True
    
    # 5. Add pagination controls to headers
    # Look for h3 elements that are likely card headers
    card_counter = 0
    def add_pagination_to_header(match):
        nonlocal card_counter
        card_counter += 1
        
        full_match = match.group(0)
        header = match.group(1)
        
        # Check if this header is followed by a card with our pagination
        following_content = content[match.end():match.end()+500]
        if f'cardPage{card_counter}' in following_content:
            return f'''<div className="flex justify-between items-center mb-4">
            {header}
            <div className="flex space-x-2">
              <button 
                onClick={{() => setCardPage{card_counter}(Math.max(0, cardPage{card_counter} - 1))}}
                disabled={{cardPage{card_counter} === 0}}
                className="px-2 py-1 text-sm border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button 
                onClick={{() => setCardPage{card_counter}(cardPage{card_counter} + 1)}}
                className="px-2 py-1 text-sm border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>'''
        
        return full_match
    
    # Find h3 headers and add pagination controls
    h3_pattern = r'(<h3 className="[^"]*">[^<]+</h3>)'
    if re.search(h3_pattern, content):
        content = re.sub(h3_pattern, add_pagination_to_header, content)
        changes_made = True
    
    # Write back if changes were made
    if changes_made and content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

def main():
    """Process all console files comprehensively"""
    
    base_path = r'c:\Users\abdal\Desktop\maysar-express-backend'
    consoles = ['admin-console', 'seller-console', 'supplier-console', 'enabler-console', 'courier-console']
    
    total_processed = 0
    
    for console in consoles:
        console_path = os.path.join(base_path, console)
        if not os.path.exists(console_path):
            print(f"SKIP: {console} (directory not found)")
            continue
        
        # Find all page.tsx files
        pattern = os.path.join(console_path, 'src', 'app', '**', 'page.tsx')
        page_files = glob.glob(pattern, recursive=True)
        
        console_processed = 0
        for file_path in page_files:
            try:
                if add_comprehensive_pagination(file_path):
                    rel_path = os.path.relpath(file_path, base_path)
                    print(f"UPDATED: {rel_path}")
                    console_processed += 1
                    total_processed += 1
            except Exception as e:
                rel_path = os.path.relpath(file_path, base_path)
                print(f"ERROR: {rel_path}: {str(e)}")
        
        print(f"{console}: {console_processed} files updated")
    
    print(f"\nTOTAL: {total_processed} files updated with comprehensive pagination")

if __name__ == "__main__":
    main()