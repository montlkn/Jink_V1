export interface Env {}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("NYC Archive Proxy v2.0 - OK", { status: 200 });
    }

    // /fetch?bbl=XXX        → returns a single image (legacy, uses first result)
    // /list?bbl=XXX         → returns JSON array of all image URLs for this BBL
    // /image?io=IO_xxx      → proxies a single image by IO ID
    if (url.pathname === "/image") {
      return proxyImage(url);
    }

    if (url.pathname !== "/fetch" && url.pathname !== "/list") {
      return new Response("Not Found", { status: 404 });
    }

    const bbl = url.searchParams.get("bbl");
    if (!bbl || bbl.length < 7) {
      return new Response("Missing or invalid `bbl` parameter", { status: 400 });
    }

    const boroughId = parseInt(bbl.substring(0, 1), 10);
    const BOROUGH_COLLECTIONS: { [key: number]: string } = {
      1: "SO_975f712b-36ad-47b7-9cbe-cc3903b25a28",
      2: "SO_9e4eb57a-ad8d-4a1d-aab2-ad185f3bc776",
      3: "SO_08e7300c-3bed-42a9-b36b-67a82c6de64d",
      4: "SO_b14bdf88-6623-45ab-b049-59cbfee063af",
      5: "SO_34a3ebbc-4c5e-4bb5-abd9-1e1df85bcfdf"
    };

    const collectionId = BOROUGH_COLLECTIONS[boroughId];
    if (!collectionId) {
      return new Response(`Invalid borough in BBL: ${bbl}`, { status: 400 });
    }

    // Format BBL into dof query string: dof_{borough}_{block5}_{lot4}
    const block = bbl.substring(1, 6);
    const lot = bbl.substring(6, 10);
    const dofQuery = `dof_${boroughId}_${block}_${lot}`;
    const searchUrl = `https://nycrecords.access.preservica.com/uncategorized/${collectionId}/?q=${dofQuery}`;

    const searchResp = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html"
      }
    });

    if (!searchResp.ok) {
      return new Response(JSON.stringify({ error: `Search page returned ${searchResp.status}` }), {
        status: 502, headers: { "Content-Type": "application/json" }
      });
    }

    const html = await searchResp.text();

    // Extract ALL IO UUIDs from thumbnail URLs
    const ioRegex = /\/download\/thumbnail\/(IO_[a-f0-9-]+)/g;
    const ioIds: string[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = ioRegex.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        ioIds.push(m[1]);
      }
    }

    if (ioIds.length === 0) {
      return new Response(JSON.stringify({ error: "No tax photo found for this BBL.", bbl, dof: dofQuery }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // /list → return all image URLs as JSON
    if (url.pathname === "/list") {
      const baseUrl = new URL(request.url).origin;
      const images = ioIds.map(io => ({
        io_id: io,
        url: `${baseUrl}/image?io=${io}`
      }));
      return new Response(JSON.stringify({ bbl, count: images.length, images }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }

    // /fetch → legacy: proxy first image directly
    return proxyImageById(ioIds[0]);
  }
};

async function proxyImage(url: URL): Promise<Response> {
  const io = url.searchParams.get("io");
  if (!io || !io.startsWith("IO_")) {
    return new Response("Missing or invalid `io` parameter", { status: 400 });
  }
  return proxyImageById(io);
}

async function proxyImageById(ioId: string): Promise<Response> {
  const imageUrl = `https://nycrecords.access.preservica.com/download/thumbnail/${ioId}?fallback-thumbnail=1`;
  const imageResp = await fetch(imageUrl, {
    headers: {
      "Referer": "https://nycrecords.access.preservica.com/",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
  });

  return new Response(imageResp.body, {
    status: imageResp.status,
    headers: {
      "Content-Type": imageResp.headers.get("Content-Type") || "image/jpeg",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
