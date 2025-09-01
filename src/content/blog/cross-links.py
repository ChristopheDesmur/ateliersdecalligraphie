import sys
import yaml
import os
import re

def extract_frontmatter_and_body(filename):
    """Return (tags, body_text) from a markdown file."""
    tags = []
    body = ""
    with open(filename, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    if lines and lines[0].strip() == "---":
        try:
            end_index = next(i for i, line in enumerate(lines[1:], start=1) if line.strip() == "---")
        except StopIteration:
            end_index = 0
        if end_index:
            frontmatter = "".join(lines[1:end_index])
            try:
                metadata = yaml.safe_load(frontmatter)
                if metadata:
                    if "tag" in metadata:
                        t = metadata["tag"]
                        tags.extend(t if isinstance(t, list) else [t])
                    if "tags" in metadata:
                        t = metadata["tags"]
                        tags.extend(t if isinstance(t, list) else [t])
            except yaml.YAMLError:
                pass
            body = "".join(lines[end_index+1:])
        else:
            body = "".join(lines)
    else:
        body = "".join(lines)
    
    return tags, body

def link_keywords_in_body(body, tag_to_files, current_file, used_targets):
    """
    Replace at most one keyword in body with a markdown link to another file,
    skipping headings and avoiding reused target files.
    """
    new_lines = []
    linked = False  # only one link per file

    for line in body.splitlines():
        if linked:
            new_lines.append(line)
            continue

        if line.strip().startswith("#"):  # skip headings
            new_lines.append(line)
            continue

        # process normal lines
        for tag, files in tag_to_files.items():
            if not tag:
                continue
            # pick first available target file (not self, not already used)
            target_file = next((f for f in files if f != current_file and f not in used_targets), None)
            if not target_file:
                continue

            # Regex: match whole word, case-insensitive
            pattern = r'\b(' + re.escape(tag) + r')\b'
            replacement = r'[\1](' + target_file + ')'

            new_line, count = re.subn(pattern, replacement, line, count=1, flags=re.IGNORECASE)
            if count > 0:
                line = new_line
                linked = True
                used_targets.add(target_file)  # mark target as "taken"
                break  # stop after first successful link

        new_lines.append(line)

    return "\n".join(new_lines) + "\n", used_targets

def main():
    files = sys.argv[1:]
    if not files:
        files = [f for f in os.listdir(".") if f.endswith(".md")]

    file_data = {}
    tag_to_files = {}

    # Pass 1: collect tags
    for file in files:
        tags, body = extract_frontmatter_and_body(file)
        file_data[file] = (tags, body)
        for tag in tags:
            tag_to_files.setdefault(tag, []).append(file)

    # Track used targets globally
    used_targets = set()

    # Pass 2: rewrite bodies with links
    for file, (tags, body) in file_data.items():
        linked_body, used_targets = link_keywords_in_body(body, tag_to_files, file, used_targets)

        # rebuild file with frontmatter + new body
        with open(file, "r", encoding="utf-8") as f:
            lines = f.readlines()
        if lines and lines[0].strip() == "---":
            end_index = next(i for i, line in enumerate(lines[1:], start=1) if line.strip() == "---")
            frontmatter = "".join(lines[:end_index+1])
            new_content = frontmatter + linked_body
        else:
            new_content = linked_body

        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)

        print(f"Processed: {file}")

if __name__ == "__main__":
    main()

