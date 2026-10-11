export function validateEmail(email: string): string | null {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return 'Podaj adres e-mail';
  if (!re.test(email)) return 'Niepoprawny adres e-mail';
  return null;
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Hasło musi mieć min. 8 znaków';
  if (!/[a-zA-Z]/.test(pw)) return 'Hasło musi zawierać literę';
  if (!/[0-9]/.test(pw)) return 'Hasło musi zawierać cyfrę';
  return null;
}

export function validateNickname(nick: string): string | null {
  if (nick.length < 3) return 'Pseudonim musi mieć min. 3 znaki';
  if (nick.length > 24) return 'Pseudonim może mieć maks. 24 znaki';
  return null;
}
