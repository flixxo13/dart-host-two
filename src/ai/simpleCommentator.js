export function simpleCommentary(round, scoreBefore, scoreAfter){

  const throws = round.map(d => d.value)
  const sum = throws.reduce((a,b)=>a+b,0)

  if(sum === 180){
    return "Drei perfekte Treffer. Das sind 180 Punkte."
  }

  if(sum >= 140){
    return `Sehr starke Runde mit ${sum} Punkten`
  }

  if(scoreAfter === 0){
    return "Spiel beendet. Der Spieler gewinnt dieses Leg."
  }

  return `Der Spieler erzielt ${sum} Punkte`
}