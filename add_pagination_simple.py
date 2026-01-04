#!/usr/bin/env python3
import os
import re
import glob

def process_file(file_path):
    """Process a single React component file to add pagination"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 1. Add useState import if not present
    if 'useState' not in content and 'useQuery' in content:
        content = re.sub(
            r"import { useQuery } from '@tanstack/react-query';",
            "import { useQuery } from '@tanstack/react-query';\nimport { useState } from 'react';",
            content
        )
    
    # 2. Add pagination state after component declaration
    component_pattern = r'(export default function \w+\(\) {\s*(?:const \w+ = [^;]+;\s*)*)'
    if re.search(component_pattern, content):
        # Count how many cards we'll need pagination for
        card_count = len(re.findall(r'\.slice\(0,\s*\d+\)\.map\(', content))
        
        if card_count > 0:
            pagination_states = '\n'.join([f'  const [page{i+1}, setPage{i+1}] = useState(0);' for i in range(card_count)])
            content = re.sub(
                component_pattern,
                r'\1' + pagination_states + '\n',
                content
            )
    
    # 3. Transform cards with .slice(0, X).map() pattern
    card_counter = 0
    
    def replace_slice_pattern(match):
        nonlocal card_counter
        card_counter += 1
        
        array_part = match.group(1)  # everything before .slice
        slice_num = match.group(2)   # the number in slice(0, X)
        map_part = match.group(3)    # everything after .slice(0, X)
        
        return f"{array_part}.slice(page{card_counter} * 2, (page{card_counter} + 1) * 2){map_part}"
    
    content = re.sub(r'([^.]+)\.slice\(0,\s*(\d+)\)(\.map\([^}]+\}[^}]*\))', replace_slice_pattern, content)
    
    # 4. Add pagination controls to card headers
    card_counter = 0
    
    def add_pagination_header(match):
        nonlocal card_counter
        card_counter += 1
        
        header = match.group(1)
        
        pagination_controls = f'''<div className="flex justify-between items-center mb-4">
            {header}
            <div className="flex space-x-2">
              <button 
                onClick={{() => setPage{card_counter}(Math.max(0, page{card_counter} - 1))}}
                disabled={{page{card_counter} === 0}}
                className="px-2 py-1 text-sm border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button 
                onClick={{() => setPage{card_counter}(page{card_counter} + 1)}}
                className="px-2 py-1 text-sm border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>'''
        
        return pagination_controls
    
    # Find h3 headers that are followed by card content with our modified slice pattern
    content = re.sub(
        r'(<h3 className="[^"]*">[^<]+</h3>)(?=\s*</div>\s*<div className="[^"]*space-y-3[^"]*">\s*{[^}]*\.slice\(page\d+)',
        add_pagination_header,
        content
    )
    
    # Only write if content changed
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

def main():
    """Process all console page files"""
    
    base_path = r'c:\Users\abdal\Desktop\maysar-express-backend'
    consoles = ['admin-console', 'seller-console', 'supplier-console', 'enabler-console', 'courier-console']
    
    processed_count = 0
    
    for console in consoles:
        console_path = os.path.join(base_path, console)
        if not os.path.exists(console_path):
            continue
        
        # Find all page.tsx files
        pattern = os.path.join(console_path, 'src', 'app', '**', 'page.tsx')
        page_files = glob.glob(pattern, recursive=True)
        
        for file_path in page_files:
            try:
                if process_file(file_path):
                    print(f"✅ {os.path.relpath(file_path, base_path)}")
                    processed_count += 1
                else:
                    print(f"⏭️  {os.path.relpath(file_path, base_path)} (no changes needed)")
            except Exception as e:
                print(f"❌ {os.path.relpath(file_path, base_path)}: {str(e)}")
    
    print(f"\n🎉 Processed {processed_count} files with pagination")

if __name__ == "__main__":
    main()