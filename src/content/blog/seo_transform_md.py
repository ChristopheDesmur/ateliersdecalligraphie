import os
import openai
from openai import OpenAI

client = OpenAI()
import time
from pathlib import Path

# === CONFIGURATION ===
MODEL = "gpt-4o"
INPUT_DIR = "."
OUTPUT_DIR = "."
DAILY_LIMIT = 1000
DELAY_BETWEEN_CALLS = 1
MAX_TOKENS = 4096

SYSTEM_PROMPT = "Tu es un assistant expert en SEO éditorial pour des enseignements oraux zen publiés au format Astro Markdown."

USER_PROMPT = """
**Task:** You are an advanced content SEO assistant. Your job is to analyze the given content and create a 1st level title for the content, just below the YAML frontmatter in French. The keywords it contains should be inferred from the overall meaning and themes of the content, not just extracted keywords. Use sentence case in headings. Keep the original content unchanged. Do not suppress any line from the original content. Keep the titles and headings.


**Input Format:**
- The title and content will be provided as plain text. Analyze the title and content holistically to infer metadata, categories, and keywords.

Provide the full unredacted Markdown code with no introduction nor end summary or explanations whatsoever.
"""

# === FONCTIONS ===

def read_markdown_strip_title(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    content = "\n".join(line for i, line in enumerate(lines) if i != 0 or not line.strip().startswith("#"))
    return content.strip()

def call_openai_api(content):
    full_prompt = USER_PROMPT + "\n\n" + content
    try:
        response = client.chat.completions.create(model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": full_prompt}
        ],
        temperature=0.3,
        max_tokens=MAX_TOKENS)
        return response.choices[0].message.content
    except openai.RateLimitError:
        print("⚠️ Limite atteinte. Pause...")
        time.sleep(60)
        return call_openai_api(content)
    except Exception as e:
        print(f"❌ Erreur API : {e}")
        return None

def process_file(filepath, index):
    print(f"📄 [{index}] Traitement : {filepath.name}")
    content = read_markdown_strip_title(filepath)
    result = call_openai_api(content)
    if result:
        output_path = Path(OUTPUT_DIR) / filepath.name
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"✅ Sauvegardé : {output_path}")
    else:
        print(f"❌ Aucun résultat pour : {filepath.name}")
    time.sleep(DELAY_BETWEEN_CALLS)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    files = list(Path(INPUT_DIR).glob("*.md"))[:DAILY_LIMIT]
    print(f"🔍 {len(files)} fichiers trouvés (limite : {DAILY_LIMIT}/jour)")
    for i, file in enumerate(files, 1):
        process_file(file, i)

if __name__ == "__main__":
    main()
