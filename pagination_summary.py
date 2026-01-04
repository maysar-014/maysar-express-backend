#!/usr/bin/env python3
import os
import re
import glob

def analyze_pagination(file_path):
    """Analyze pagination implementation in a file"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Count pagination states
    pagination_states = len(re.findall(r'const \[cardPage\d+, setCardPage\d+\] = useState\(0\);', content))
    
    # Count pagination controls
    pagination_controls = len(re.findall(r'onClick=\{\(\) => setCardPage\d+\(', content))
    
    # Count paginated cards
    paginated_cards = len(re.findall(r'\.slice\(cardPage\d+ \* 2, \(cardPage\d+ \+ 1\) \* 2\)', content))
    
    return {
        'states': pagination_states,
        'controls': pagination_controls // 2,  # Divide by 2 since each card has Prev/Next
        'cards': paginated_cards
    }

def main():
    """Analyze pagination implementation across all consoles"""
    
    base_path = r'c:\Users\abdal\Desktop\maysar-express-backend'
    consoles = ['admin-console', 'seller-console', 'supplier-console', 'enabler-console', 'courier-console']
    
    print("PAGINATION IMPLEMENTATION SUMMARY")
    print("=" * 50)
    
    total_files = 0
    total_cards = 0
    
    for console in consoles:
        console_path = os.path.join(base_path, console)
        if not os.path.exists(console_path):
            continue
        
        pattern = os.path.join(console_path, 'src', 'app', '**', 'page.tsx')
        page_files = glob.glob(pattern, recursive=True)
        
        console_files = 0
        console_cards = 0
        
        print(f"\n{console.upper()}:")
        
        for file_path in page_files:
            try:
                analysis = analyze_pagination(file_path)
                if analysis['cards'] > 0:
                    rel_path = os.path.relpath(file_path, console_path)
                    print(f"  {rel_path}: {analysis['cards']} paginated cards")
                    console_files += 1
                    console_cards += analysis['cards']
                    total_files += 1
                    total_cards += analysis['cards']
            except Exception as e:
                pass
        
        if console_cards == 0:
            print(f"  No paginated cards found")
        else:
            print(f"  TOTAL: {console_files} files, {console_cards} cards")
    
    print(f"\nOVERALL SUMMARY:")
    print(f"Files with pagination: {total_files}")
    print(f"Total paginated cards: {total_cards}")
    print(f"Cards per page: 2 items")
    print(f"Navigation: Prev/Next buttons")

if __name__ == "__main__":
    main()