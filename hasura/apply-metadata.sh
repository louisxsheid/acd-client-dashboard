#!/bin/sh
# Apply Hasura metadata on startup

HASURA_ENDPOINT="${HASURA_ENDPOINT:-http://hasura:8080}"
MAX_RETRIES=30
RETRY_INTERVAL=5

echo "Waiting for Hasura to be ready at $HASURA_ENDPOINT..."

# Wait for Hasura to be healthy
for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf "$HASURA_ENDPOINT/healthz" > /dev/null 2>&1; then
    echo "Hasura is ready!"
    break
  fi
  echo "Attempt $i/$MAX_RETRIES - Hasura not ready, waiting ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

# Check if Hasura is actually ready
if ! curl -sf "$HASURA_ENDPOINT/healthz" > /dev/null 2>&1; then
  echo "ERROR: Hasura did not become ready in time"
  exit 1
fi

echo "Applying metadata..."

# Apply the metadata
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $HASURA_ADMIN_SECRET" \
  -d "{
    \"type\": \"replace_metadata\",
    \"args\": $(cat /metadata.json)
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "Metadata applied successfully!"
  echo "$BODY"
else
  echo "ERROR: Failed to apply metadata (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
