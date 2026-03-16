export function translateDartThrow(label) {

  if (!label) return ""

  if (label === "MISS") {
    return "Daneben geworfen"
  }

  if (label === "BULL") {
    return "Inneres Bullseye, fünfzig Punkte"
  }

  if (label === "25") {
    return "Äußeres Bull, fünfundzwanzig Punkte"
  }

  if (label.startsWith("T")) {
    const number = label.substring(1)
    return `Dreifach ${number}`
  }

  if (label.startsWith("D")) {
    const number = label.substring(1)
    return `Doppel ${number}`
  }

  if (label.startsWith("S")) {
    const number = label.substring(1)
    return `Einfach ${number}`
  }

  return label
}


export function translateRound(round){

  if(!round || round.length === 0) return ""

  const words = round.map(d => translateDartThrow(d.label))

  return words.join(", ")
}