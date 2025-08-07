import os
import re

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
                file_path = os.path.join(output_dir, current_file)
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
        file_path = os.path.join(output_dir, current_file)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(content).strip())
        log.append(f'Created: {file_path}')

    # Log output
    with open(os.path.join(output_dir, 'extraction_log.txt'), 'w') as f:
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