export function simpleCommentary(round, scoreBefore, scoreAfter){

  if(!round) return ""

  const values = round.map(d => d.value)

  const sum = values.reduce((a,b)=>a+b,0)

  if(sum === 180){
    return "Drei perfekte Treffer. Einhundertachtzig Punkte."
  }

  if(sum >= 140){
    return `Sehr starke Runde mit ${sum} Punkten`
  }

  if(scoreAfter === 0){
    return "Der Spieler gewinnt dieses Leg."
  }

  if(sum === 0){
    return "Leider kein Treffer in dieser Runde."
  }

  return `Der Spieler erzielt ${sum} Punkte`
}