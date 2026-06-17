# Substrata Classifier Worker

This worker is a deterministic local MVP for datasheet classification review.

## Run the sample

From the repository root:

```bash
pnpm worker:sample
```

Validate the JSON artifact:

```bash
pnpm worker:validate-sample
```

Direct Python invocation also works:

```bash
python3 workers/classifier/src/main.py workers/classifier/samples/sample-input.json
```

## Input Contract

```json
{
  "document_id": "doc_sample_orion_x7",
  "file_path": "/absolute/path/to/document.txt",
  "organization_id": "org_demo"
}
```

## Output Contract

The worker prints structured JSON to stdout and writes three artifacts:

- extracted text
- structured output JSON
- draft review memo Markdown

Every output includes:

- `requires_human_review: true`
- uncertainty flags
- ECCN candidate reasons
- citation objects
- draft memo content
