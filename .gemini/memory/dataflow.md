# Data Flow Reference

## 1. User Action
- Pastes code → Selects language → Optionally describes what the code should do → Clicks "Debug This"

## 2. Frontend (page.tsx)
- Validates input (not empty, reasonable length)
- Sets loading state to true
- Fires POST to `/api/debug`
- Body: `{ code, language, context }`

## 3. API Route (route.ts)
- Receives the request
- Validates body (code exists, language is supported)
- Imports system prompt from `lib/prompts.ts`
- Builds user message with code + language + context
- Calls OpenAI with **JSON mode enabled**
- Parses the response
- Returns structured JSON to frontend

## 4. Frontend Receives Response
- Hides loading state
- Renders each field as a separate visual card
- Animates cards appearing one by one (staggered)
- Shows share/copy buttons at the bottom
