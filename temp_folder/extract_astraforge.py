import os
import re

def validate_safe_path(user_path, base_dir):
    """
    Validate and sanitize file paths to prevent path traversal attacks.
    
    Args:
        user_path: User-provided path component
        base_dir: Base directory to restrict operations within
        
    Returns:
        tuple: (is_valid, safe_path) - safe_path is None if invalid
    """
    if not user_path or not isinstance(user_path, str):
        return False, None
    
    # Remove null bytes and control characters
    sanitized = ''.join(c for c in user_path if ord(c) >= 32)
    
    # Check for path traversal sequences
    dangerous_patterns = ['../', '..\\', './', '.\\']
    if any(pattern in sanitized for pattern in dangerous_patterns):
        return False, None
    
    # Check for absolute paths
    if os.path.isabs(sanitized):
        return False, None
    
    # Normalize path separators and remove dangerous characters
    sanitized = sanitized.replace('\\', '/').replace('//', '/')
    sanitized = re.sub(r'[<>:"|?*\x00-\x1f]', '', sanitized)
    
    # Remove leading/trailing slashes
    sanitized = sanitized.strip('/')
    
    # Check for empty result
    if not sanitized:
        return False, None
    
    # Check for dangerous filenames (Windows reserved names)
    path_parts = sanitized.split('/')
    reserved_names = ['CON', 'PRN', 'AUX', 'NUL'] + [f'COM{i}' for i in range(1, 10)] + [f'LPT{i}' for i in range(1, 10)]
    for part in path_parts:
        name_without_ext = part.split('.')[0].upper()
        if name_without_ext in reserved_names:
            return False, None
    
    # Construct full path and check if it's within base directory
    try:
        full_path = os.path.normpath(os.path.join(base_dir, sanitized))
        base_abs = os.path.abspath(base_dir)
        if not full_path.startswith(base_abs + os.sep) and full_path != base_abs:
            return False, None
    except (OSError, ValueError):
        return False, None
    
    return True, sanitized

def extract_files(response_text, output_dir='astraforge-ide'):
    # Create output dir if not exists
    os.makedirs(output_dir, exist_ok=True)
    log = []  # Traceability log

    # Split into sections based on "## File: " or similar markers
    sections = re.split(r'(## File: |### src/.*\.ts|### media/.*\.js|### media/styles\.css)', response_text)
    
    current_file = None
    content = []
    for part in sections:
        if part.strip() == '':
            continue
        if part.startswith('## File: ') or part.startswith('### '):
            # Save previous file if exists
            if current_file:
                # Validate path before using it
                is_valid, safe_path = validate_safe_path(current_file, output_dir)
                if not is_valid:
                    log.append(f'Skipped dangerous path: {current_file}')
                else:
                    file_path = os.path.join(output_dir, safe_path)
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write('\n'.join(content).strip())
                    log.append(f'Created: {file_path}')
            
            # New file
            if part.startswith('## File: '):
                current_file = part.split('## File: ')[1].strip()
            else:
                # Handle nested like src/ or media/
                current_file = part.split('### ')[1].strip()
            content = []
        else:
            # Accumulate content, assuming code blocks follow
            code_match = re.search(r'```(?:\w+)?\n(.*?)```', part, re.DOTALL)
            if code_match:
                content.append(code_match.group(1))
            else:
                content.append(part)  # Fallback for non-code

    # Save last file
    if current_file and content:
        # Validate path before using it
        is_valid, safe_path = validate_safe_path(current_file, output_dir)
        if not is_valid:
            log.append(f'Skipped dangerous path: {current_file}')
        else:
            file_path = os.path.join(output_dir, safe_path)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(content).strip())
            log.append(f'Created: {file_path}')

    # Log output - use safe path for log file
    log_filename = 'extraction_log.txt'
    log_path = os.path.join(output_dir, log_filename)
    with open(log_path, 'w') as f:
        f.write('\n'.join(log))
    print('Extraction complete. Check extraction_log.txt for details.')

# Main: Read response.txt and run
if __name__ == '__main__':
    # Use the literal path with %TEMP% as a folder name
    response_path = r"C:\Users\up2it\Desktop\AstraForge\%TEMP%\response.txt"
    if not os.path.exists(response_path):
        print(f"Error: {response_path} not found. Please verify the file location.")
        response_path = input("Enter the correct path to response.txt: ")
        if not os.path.exists(response_path):
            print(f"Error: {response_path} still not found. Aborting.")
            exit(1)
    with open(response_path, 'r', encoding='utf-8') as f:
        response = f.read()
    extract_files(response)