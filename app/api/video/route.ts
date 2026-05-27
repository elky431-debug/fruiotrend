import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64, prompt } = await req.json();

    if (!process.env.GROK_API_KEY) {
      return NextResponse.json(
        { error: "GROK_API_KEY manquante" },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt vidéo manquant" },
        { status: 400 }
      );
    }

    let imageObj: { url: string };
    if (imageBase64) {
      imageObj = { url: `data:image/jpeg;base64,${imageBase64}` };
    } else if (imageUrl) {
      imageObj = { url: imageUrl };
    } else {
      return NextResponse.json(
        { error: "Image manquante" },
        { status: 400 }
      );
    }

    console.log("[VIDEO] Lancement Grok Aurora...");

    const genRes = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-video",
        prompt,
        image: imageObj,
        duration: 10,
      }),
    });

    const genText = await genRes.text();
    console.log(
      "[VIDEO] Réponse génération:",
      genRes.status,
      genText.substring(0, 300)
    );

    if (!genRes.ok) {
      return NextResponse.json(
        { error: `Grok erreur ${genRes.status}: ${genText}` },
        { status: 500 }
      );
    }

    let genData: {
      id?: string;
      request_id?: string;
    };
    try {
      genData = JSON.parse(genText) as {
        id?: string;
        request_id?: string;
      };
    } catch {
      return NextResponse.json(
        { error: `JSON invalide: ${genText}` },
        { status: 500 }
      );
    }

    const requestId = genData.id || genData.request_id;
    console.log("[VIDEO] Request ID:", requestId);

    if (!requestId) {
      return NextResponse.json(
        { error: `Pas de request_id. Réponse: ${genText}` },
        { status: 500 }
      );
    }

    let notFoundCount = 0;

    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      console.log(`[VIDEO] Polling ${i + 1}/40...`);

      let statusRes: Response;
      try {
        statusRes = await fetch(
          `https://api.x.ai/v1/videos/${requestId}`,
          {
            headers: { Authorization: `Bearer ${process.env.GROK_API_KEY}` },
          }
        );
      } catch (fetchErr) {
        console.error(
          "[VIDEO] Erreur fetch polling:",
          fetchErr instanceof Error ? fetchErr.message : "Erreur inconnue"
        );
        continue;
      }

      const statusText = await statusRes.text();
      console.log(
        `[VIDEO] Status ${i + 1}:`,
        statusRes.status,
        statusText.substring(0, 200)
      );

      if (statusRes.status === 404) {
        notFoundCount++;
        if (notFoundCount >= 3) {
          return NextResponse.json(
            {
              error:
                "Grok polling introuvable (404) après création. Réponse: " +
                statusText.substring(0, 200),
            },
            { status: 500 }
          );
        }
        continue;
      }

      if (!statusRes.ok) continue;
      notFoundCount = 0;

      let statusData: {
        status?: string;
        video?: { url?: string; data?: string };
        output?: { url?: string; data?: string };
        url?: string;
        result?: { url?: string };
        generations?: Array<{ video?: { url?: string } }>;
        data?: Array<{ url?: string }>;
      };
      try {
        statusData = JSON.parse(statusText) as {
          status?: string;
          video?: { url?: string; data?: string };
          output?: { url?: string; data?: string };
          url?: string;
          result?: { url?: string };
          generations?: Array<{ video?: { url?: string } }>;
          data?: Array<{ url?: string }>;
        };
      } catch {
        continue;
      }

      const status = statusData.status;
      console.log("[VIDEO] Status value:", status);

      if (
        ["succeeded", "done", "completed", "finished"].includes(
          status || ""
        )
      ) {
        const videoUrl =
          statusData.video?.url ||
          statusData.output?.url ||
          statusData.url ||
          statusData.result?.url ||
          statusData.generations?.[0]?.video?.url ||
          statusData.data?.[0]?.url;

        if (videoUrl) {
          console.log("[VIDEO] ✅ Vidéo prête:", videoUrl);
          return NextResponse.json({ videoUrl });
        }

        const videoBase64 = statusData.video?.data || statusData.output?.data;
        if (videoBase64) {
          console.log("[VIDEO] ✅ Vidéo prête (base64)");
          return NextResponse.json({ videoBase64 });
        }

        console.log(
          "[VIDEO] Status succeeded mais URL introuvable:",
          statusText.substring(0, 500)
        );
        return NextResponse.json(
          {
            error:
              "Vidéo prête mais URL introuvable. Réponse: " +
              statusText.substring(0, 200),
          },
          { status: 500 }
        );
      }

      if (["failed", "error", "cancelled"].includes(status || "")) {
        return NextResponse.json(
          {
            error: `Grok génération échouée: ${statusText.substring(0, 200)}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Timeout après 5 minutes" },
      { status: 504 }
    );
  } catch (error) {
    console.error("[VIDEO] Erreur globale:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur vidéo" },
      { status: 500 }
    );
  }
}
