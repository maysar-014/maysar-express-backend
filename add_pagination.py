#!/usr/bin/env python3
import os
import re
import glob

def add_pagination_to_file(file_path):
    """Add pagination to cards in a React component file"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip if useState is already imported
    if 'useState' not in content:
        # Add useState import
        content = re.sub(
            r"import { useQuery } from '@tanstack/react-query';",
            "import { useQuery } from '@tanstack/react-query';\nimport { useState } from 'react';",
            content
        )
    
    # Find all card sections that contain .slice() or .map() with data arrays
    card_patterns = [
        # Pattern for cards with .slice(0, X).map()
        (r'(\s+)({[^}]*\.slice\(0,\s*\d+\)[^}]*\.map\([^}]*\)\s*})', r'\1{/* PAGINATED_CARD */}\2'),
        # Pattern for cards with .map() directly on filtered arrays
        (r'(\s+)({[^}]*\.filter\([^}]*\)\.map\([^}]*\)\s*})', r'\1{/* PAGINATED_CARD */}\2'),
    ]
    
    # Add pagination state variables at the beginning of component
    component_match = re.search(r'export default function (\w+)\(\) {', content)
    if component_match:
        component_name = component_match.group(1)
        
        # Find existing state declarations
        state_pattern = r'(export default function \w+\(\) {\s*(?:[^;]*;\s*)*)'
        state_match = re.search(state_pattern, content)
        
        if state_match:
            # Add pagination states after existing states
            pagination_states = """
  // Pagination states
  const [cardPage1, setCardPage1] = useState(0);
  const [cardPage2, setCardPage2] = useState(0);
  const [cardPage3, setCardPage3] = useState(0);
  const [cardPage4, setCardPage4] = useState(0);
"""
            content = content.replace(state_match.group(1), state_match.group(1) + pagination_states)
    
    # Transform cards with pagination
    card_counter = 0
    
    # Pattern to find cards with lists that need pagination
    card_list_pattern = r'(<div className="[^"]*space-y-3[^"]*">\s*{)([^}]*\.(?:slice\(\d+,\s*\d+\)|filter\([^)]*\))\.map\([^}]*\))(\s*}\s*</div>)'
    
    def replace_card_content(match):
        nonlocal card_counter
        card_counter += 1
        
        before = match.group(1)
        content_part = match.group(2)
        after = match.group(3)
        
        # Extract the array variable name
        array_match = re.search(r'(\w+)\.(?:slice|filter)', content_part)
        if not array_match:
            return match.group(0)
        
        array_name = array_match.group(1)
        
        # Create pagination logic
        paginated_content = f"""
            {array_name}
              .slice(cardPage{card_counter} * 2, (cardPage{card_counter} + 1) * 2)
              .map((item) => (
                // Card content here
              ))
        """
        
        return before + paginated_content + after
    
    # Apply the transformation
    content = re.sub(card_list_pattern, replace_card_content, content, flags=re.DOTALL)
    
    # Add pagination controls to card headers
    header_pattern = r'(<h3 className="[^"]*">[^<]*</h3>)(\s*</div>)'
    
    def add_pagination_controls(match):
        nonlocal card_counter
        if card_counter > 0:
            card_counter -= 1
            pagination_controls = f"""
            <div className="flex space-x-2">
              <button 
                onClick={{() => setCardPage{card_counter + 1}(Math.max(0, cardPage{card_counter + 1} - 1))}}
                disabled={{cardPage{card_counter + 1} === 0}}
                className="px-2 py-1 text-sm border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button 
                onClick={{() => setCardPage{card_counter + 1}(cardPage{card_counter + 1} + 1)}}
                className="px-2 py-1 text-sm border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4">
            {match.group(1)}
            <div className="flex space-x-2">
              <button 
                onClick={{() => setCardPage{card_counter + 1}(Math.max(0, cardPage{card_counter + 1} - 1))}}
                disabled={{cardPage{card_counter + 1} === 0}}
                className="px-2 py-1 text-sm border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button 
                onClick={{() => setCardPage{card_counter + 1}(cardPage{card_counter + 1} + 1)}}
                className="px-2 py-1 text-sm border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>"""
            return pagination_controls
        return match.group(0)
    
    # Write the modified content back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Added pagination to: {file_path}")

def main():
    """Main function to process all console page files"""
    
    # Define console directories
    consoles = [
        'admin-console',
        'seller-console', 
        'supplier-console',
        'enabler-console',
        'courier-console'
    ]
    
    base_path = r'c:\Users\abdal\Desktop\maysar-express-backend'
    
    processed_files = []
    
    for console in consoles:
        console_path = os.path.join(base_path, console)
        if not os.path.exists(console_path):
            print(f"⚠️  Console directory not found: {console_path}")
            continue
        
        # Find all page.tsx files in the console
        pattern = os.path.join(console_path, 'src', 'app', '**', 'page.tsx')
        page_files = glob.glob(pattern, recursive=True)
        
        for file_path in page_files:
            try:
                add_pagination_to_file(file_path)
                processed_files.append(file_path)
            except Exception as e:
                print(f"❌ Error processing {file_path}: {str(e)}")
    
    print(f"\n🎉 Pagination added to {len(processed_files)} files:")
    for file_path in processed_files:
        print(f"   - {os.path.relpath(file_path, base_path)}")

if __name__ == "__main__":
    main()