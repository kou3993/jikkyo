export interface Comment {
  id: number;
  text: string;
  date: Date;
  vpos: number;
  commenter: string;
  pos?: "ue" | "shita";
  size?: "big" | "small";
  color?: string;
  color2: string;
  hash: number;
}

const niconicoColors = {
  // white: "#fff", // default
  red: "#f00",
  pink: "#ff8080",
  orange: "#ffc000",
  yellow: "#ff0",
  green: "#0f0",
  cyan: "#0ff",
  blue: "#00f",
  purple: "#c000ff",
  black: "#000",
  white2: "#cc9",
  niconicowhite: "#cc9",
  red2: "#c03",
  truered: "#c03",
  pink2: "#f3c",
  orange2: "#f60",
  passionorange: "#f60",
  yellow2: "#99d",
  madyellow: "#99d",
  green2: "#0c6",
  elementalgreen: "#0c6",
  cyan2: "#0cc",
  blue2: "#39f", // #33FFFC in niconama
  marineblue: "#39f", // #33FFFC in niconama
  purple2: "#63c",
  nobleviolet: "#63c",
  black2: "#666"
};

export const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (!e.target) {
        throw new Error("cannot read file");
      }
      resolve(e.target.result as string);
    };
    reader.onerror = () => reject(new Error("cannot read file"));
    reader.readAsText(file);
  });

export const readComments = async (
  xml: string
): Promise<[Comment[], number]> => {
  const parser = new DOMParser();
  const dom = parser.parseFromString(xml, "application/xml");
  if (dom.documentElement.nodeName === "parsererror") {
    throw new Error("xml parse error");
  }

  const comments = Array.from(dom.querySelectorAll("chat")).map(
    (node, i): Comment => {
      const mail = (node.getAttribute("mail") || "").split(" ");
      let color;
      mail.some(m => {
        if (m in niconicoColors) {
          color = (niconicoColors as any)[m];
          return true;
        }
        if (/^#([\w\d]{3}|[\w\d]{6})$/.test(m)) {
          color = m;
          return true;
        }
        return false;
      });

      const commenter = node.getAttribute("user_id") || "";
      const hash = commenter
        ? /^[0-9]+$/.test(commenter)
          ? parseInt(commenter, 10)
          : hashCode(commenter)
        : Math.random() * 0xffffff;
      const [r, g, b] = hashCode2Color(hash);

      return {
        id: i,
        text: node.textContent || "",
        date: new Date(parseInt(node.getAttribute("date") || "", 10) * 1000),
        // vpos: convert into ms
        vpos: parseInt(node.getAttribute("vpos") || "", 10) * 10,
        commenter,
        pos: mail.includes("ue")
          ? "ue"
          : mail.includes("shita")
          ? "shita"
          : undefined,
        size: mail.includes("big")
          ? "big"
          : mail.includes("small")
          ? "small"
          : undefined,
        color,
        color2: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
        hash
      };
    }
  );

  let validComments = comments
    .filter(
      c => c.text !== "" && !isNaN(c.vpos)
      // && !isNaN(c.date.getTime()) && c.commenter !== ""
    )
    .sort((a, b) => a.vpos - b.vpos);

  const invalidCommnents = comments.length - validComments.length;
  if (invalidCommnents > 0) {
    console.warn(`${invalidCommnents} invalid comments are ignored.`);
  }

  return [
    validComments,
    validComments.length === 0
      ? 0
      : validComments[validComments.length - 1].vpos
  ];
};

function hashCode(str: string) {
  let hash = 0,
    i,
    len;
  if (str.length === 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function hashCode2Color(hash: number): [number, number, number] {
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;
  return [r, g, b];
}

function toHex(num: number) {
  return ("0" + num.toString(16)).slice(-2);
}

export default async (file: File) => readComments(await readText(file));
