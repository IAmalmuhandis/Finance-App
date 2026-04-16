export function categorize(description: string): string {
  const d = description.toLowerCase();
  if (/shoprite|chicken republic|dominos|kfc|coldstone|eatery|restaurant|food|supermarket|spar|market|fried|bukka|amala|suya/.test(d)) return "Food & Dining";
  if (/filling station|total|ardova|nipco|uber|bolt|petrol|fuel|transport|nnpc|taxify|okada|tricycle|bus/.test(d)) return "Fuel & Transport";
  if (/netflix|spotify|apple|amazon prime|dstv|gotv|startimes|showmax|youtube premium|canva|chatgpt|openai/.test(d)) return "Subscriptions";
  if (/transfer|trf|sent to|received from|payment to|bank transfer|interbank/.test(d)) return "Transfers";
  if (/nepa|ekedc|ikedc|phcn|eko electric|water|lawma|waste|rent|tenancy/.test(d)) return "Bills & Utilities";
  if (/jumia|konga|amazon|aliexpress|online|store|mall|fashion|clothing|shoe|bag/.test(d)) return "Shopping";
  if (/invoice|client|contract|commission|salary|payroll|wages|business|freelance/.test(d)) return "Business";
  if (/atm|cash withdrawal|pos withdrawal/.test(d)) return "Cash & ATM";
  if (/church|mosque|tithe|offering|donation|charity/.test(d)) return "Giving";
  if (/hospital|pharmacy|clinic|health|doctor|medical|lab|test/.test(d)) return "Health";
  return "Other";
}

