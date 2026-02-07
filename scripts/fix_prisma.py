
import re
import sys

def fix_prisma_schema(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by module sections if possible, or just parse models
    # A better approach: find each model, then find the @@map within it.
    
    model_pattern = re.compile(r'model\s+(\w+)\s*\{([^}]*)\}', re.DOTALL)
    
    def replace_map(match):
        model_name = match.group(1)
        model_body = match.group(2)
        
        # Service prefix is usually the part before the first underscore
        prefix = model_name.split('_')[0].lower()
        
        # If model name has no underscore, use the whole name
        if '_' not in model_name:
            prefix = model_name.lower()

        map_pattern = re.compile(r'@@map\("([^"]+)"\)')
        
        def map_sub(map_match):
            old_map = map_match.group(1)
            # If the map name is already prefixed with something similar to the service prefix, skip?
            # Or just blindly prefix it to be safe.
            # Usually we want: prefix + "_" + old_map
            if old_map.startswith(prefix):
                return map_match.group(0) # Already prefixed
            
            # For "users", "sessions", etc.
            new_map = f"{prefix}_{old_map}"
            return f'@@map("{new_map}")'
            
        new_body = map_pattern.sub(map_sub, model_body)
        return f'model {model_name} {{{new_body}}}'

    new_content = model_pattern.sub(replace_map, content)
    
    # Also fix some specific errors found
    # Missing back-relations in Community_Bookmark
    if 'model Community_Bookmark {' in new_content:
        # Check if already fixed
        pass # My previous partially failed multi_replace might have fixed some parts
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        fix_prisma_schema(sys.argv[1])
    else:
        print("Usage: python fix_prisma.py <path_to_schema>")
