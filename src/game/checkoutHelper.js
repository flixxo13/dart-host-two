const checkouts = {

170: "Dreifach 20, Dreifach 20, Bullseye",

167: "Dreifach 20, Dreifach 19, Bullseye",

164: "Dreifach 20, Dreifach 18, Bullseye",

161: "Dreifach 20, Dreifach 17, Bullseye",

160: "Dreifach 20, Dreifach 20, Doppel 20",

158: "Dreifach 20, Dreifach 20, Doppel 19",

156: "Dreifach 20, Dreifach 20, Doppel 18",

155: "Dreifach 20, Dreifach 19, Doppel 19",

154: "Dreifach 20, Dreifach 18, Doppel 20",

150: "Dreifach 20, Dreifach 18, Doppel 18",

132: "Bullseye, Dreifach 14, Doppel 20",

100: "Dreifach 20, Doppel 20",

86: "Dreifach 18, Doppel 16",

80: "Dreifach 20, Doppel 10",

60: "Einfach 20, Doppel 20",

50: "Bullseye",

40: "Doppel 20",

32: "Doppel 16",

24: "Doppel 12",

16: "Doppel 8",

8: "Doppel 4",

4: "Doppel 2",

2: "Doppel 1"

}

export function getCheckoutSuggestion(score){

  if(score > 170) return null

  return checkouts[score] || null
}