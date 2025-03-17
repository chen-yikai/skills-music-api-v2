import { Hono } from "hono";
import { readdir } from "fs/promises";

interface Sound {
  id: number;
  name: string;
  description: string;
  tags: string[];
  audio: string;
  cover: string;
}

const app = new Hono();

async function generateApi(): Promise<Sound[]> {
  const sounds: Sound[] = [];
  const dirPath = "./assets/music";

  try {
    const files = await readdir(dirPath);

    for (const fileName of files) {
      if (fileName.endsWith(".mp3")) {
        const title = fileName
          .replace(".mp3", "")
          .replace("_", " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        const descriptionFile = Bun.file(
          `./assets/description/${fileName.replace(".mp3", ".txt")}`,
        );
        const description = await descriptionFile.text();

        sounds.push({
          id: sounds.length + 1,
          name: title,
          description: description.split("\n")[0],
          tags: description.split("\n")[1].split("-"),
          audio: `/audio/${fileName}`,
          cover: `/cover/${fileName.replace(".mp3", ".jpg")}`,
        });
      }
    }
    return sounds;
  } catch (error) {
    console.log(error);
    return [];
  }
}

app.get("/sounds", async (c) => {
  const sounds = await generateApi();
  const search = c.req.header("search");
  if (search) {
    // filiter by name and tags
    const filteredSounds = sounds.filter(
      (sound) =>
        sound.name.toLowerCase().includes(search.toLowerCase()) ||
        sound.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase()),
        ),
    );
    return c.json(
      filteredSounds.length > 0 ? filteredSounds : { error: "No sounds found" },
      filteredSounds.length > 0 ? 200 : 404,
    );
  }
  return c.json(
    sounds != null ? sounds : { error: "No sounds found" },
    sounds != null ? 200 : 404,
  );
});

app.get("/audio/:fileName", async (c) => {
  const fileName = c.req.param("fileName");
  const filePath = `./assets/music/${fileName}`;
  const file = Bun.file(filePath);

  if (await file.exists()) {
    return c.body(file.stream(), {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  }
  return c.json({ error: "Audio file not found" }, 404);
});

app.get("/cover/:fileName", async (c) => {
  const fileName = c.req.param("fileName");
  const filePath = `./assets/cover/${fileName}`;
  const file = Bun.file(filePath);

  if (await file.exists()) {
    return c.body(file.stream(), {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  }
  return c.json({ error: "Cover image not found" }, 404);
});

Bun.serve({
  fetch: app.fetch,
  port: process.env.PORT || 3000,
});

console.log(`Server running on port ${process.env.PORT || 3000}`);
