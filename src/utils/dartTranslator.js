export function translateDartThrow(label) {

  if(label === "MISS") return "Daneben geworfen"

  if(label === "BULL") return "Inneres Bullseye, 50 Punkte"

  if(label === "25") return "Äußeres Bull, 25 Punkte"

  if(label.startsWith("T")) {
    const number = label.substring(1)
    return `Dreifach ${number}`
  }

  if(label.startsWith("D")) {
    const number = label.substring(1)
    return `Doppel ${number}`
  }

  if(label.startsWith("S")) {
    const number = label.substring(1)
    return `Einfach ${number}`
  }

  return label
}