# Hireal Zypher - Person Research Agent

A self-autonomous AI agent built with the Zypher framework that crawls the internet to gather comprehensive information about individuals. Features a beautiful, modern chatbot interface with frosted glass design elements.

## Features

- **Autonomous Research**: The agent independently searches for and verifies information about individuals
- **Comprehensive Data Gathering**: Collects Name, Age, Gender, Location, Professional History, Educational History, and Fun Facts
- **Information Verification**: Cross-references multiple sources to verify data accuracy
- **Alternative Search Methods**: Uses creative approaches (e.g., finding LinkedIn through company websites) when direct searches fail
- **Real-time Streaming**: Live updates as the agent discovers information
- **Modern UI**: Clean, minimalist design with frosted glass, metallic surfaces, gradients, and shadows

## Prerequisites

- **Deno 2.0+** ([install here](https://deno.com/))
- **Node.js 18+** and **npm** ([install here](https://nodejs.org/))
- **API Keys**:
  - Anthropic API key ([get one here](https://console.anthropic.com/))
  - Firecrawl API key ([get one here](https://www.firecrawl.dev/))

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/TeamJobHatch/hireal-zypher.git
cd hireal-zypher
```

### 2. Set up environment variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
PORT=8000
```

### 3. Install backend dependencies (Deno)

```bash
deno add jsr:@zypher/agent
deno add npm:rxjs-for-await
```

### 4. Install frontend dependencies (Node.js)

```bash
npm install
```

## Running the Application

### Start the Backend Server (Deno)

In one terminal, start the Zypher agent server:

```bash
deno task server
# or
deno run -A server.ts
```

The server will run on `http://localhost:8000` by default.

### Start the Frontend (Next.js)

In another terminal, start the Next.js development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Usage

1. Open `http://localhost:3000` in your browser
2. Enter a person's name in the chat interface
3. Click "Research" to start the autonomous agent
4. Watch as the agent streams real-time updates while gathering information
5. View structured results with verification status for each data point

## Architecture

### Backend (`server.ts`)
- Deno HTTP server exposing the Zypher agent via API endpoints
- Server-Sent Events (SSE) for real-time streaming
- Autonomous agent logic with information verification
- Alternative search method strategies

### Frontend (`app/` and `components/`)
- Next.js 14 with React Server Components
- Modern chatbot interface with streaming support
- Beautiful UI with custom CSS (frosted glass, metallic surfaces)
- Real-time message updates via SSE

## Agent Capabilities

The agent autonomously:

1. **Searches** multiple sources for person information
2. **Verifies** data by cross-referencing sources
3. **Uses alternative methods** when direct searches fail:
   - Finding LinkedIn profiles through company websites
   - Searching professional directories
   - Checking university alumni pages
   - Looking for social media profiles
   - Searching news articles and press releases
4. **Structures** information into organized categories
5. **Flags** unverified or inconsistent information

## Design Features

- **Frosted Glass Effects**: Backdrop blur with transparency
- **Metallic Surfaces**: Gradient overlays with shine animations
- **Rounded Corners**: Modern, soft edges throughout
- **Gradients**: Subtle color transitions with low saturation
- **Shadows & Reflections**: Depth and material texture
- **Black & White Theme**: Clean, minimalist aesthetic

## Development

### Backend Development

The agent uses:
- **Zypher Framework**: For autonomous agent capabilities
- **Anthropic Claude Sonnet 4**: As the LLM provider
- **Firecrawl MCP**: For web crawling and data extraction

### Frontend Development

Built with:
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Custom CSS**: For advanced design effects

## Project Structure

```
hireal-zypher/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ChatInterface.tsx  # Main chat component
│   └── PersonInfoCard.tsx # Information display component
├── server.ts              # Deno backend server
├── main.ts                # Original CLI agent (optional)
├── deno.json              # Deno configuration
├── package.json           # Node.js dependencies
└── README.md              # This file
```

## API Endpoints

### `POST /api/research`

Start a person research task.

**Request Body:**
```json
{
  "personName": "John Doe"
}
```

**Response:**
Server-Sent Events stream with real-time agent updates.

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Resources

- [Zypher Agent Documentation](https://zypher.dev/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Firecrawl Documentation](https://docs.firecrawl.dev/)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
