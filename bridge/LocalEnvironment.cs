using System.Text.Json;
using System.Text.RegularExpressions;
namespace SchoolBridge;
public static class LocalEnvironment
{
    public static Dictionary<string, string> Parse(string text)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var line in text.Split('\n'))
        {
            var entry = line.Trim(); if (entry.Length == 0 || entry.StartsWith('#')) continue;
            var separator = entry.IndexOf('='); if (separator < 1) throw new FormatException("Formato .env inválido");
            var key = entry[..separator].Trim(); var value = entry[(separator + 1)..].Trim();
            if (!Regex.IsMatch(key, "^[A-Z][A-Z0-9_]*$") || values.ContainsKey(key)) throw new FormatException("Clave .env inválida o duplicada");
            if (value.StartsWith('"'))
            {
                if (value.Length < 2 || !value.EndsWith('"')) throw new FormatException("Valor .env inválido");
                value = value[1..^1].Replace("\\n", "\n").Replace("\\r", "\r");
            }
            else if (value.StartsWith('\'') || value.StartsWith('`'))
            {
                if (value.Length < 2 || value[^1] != value[0]) throw new FormatException("Valor .env inválido");
                value = value[1..^1];
            }
            else { var comment = value.IndexOf('#'); if (comment >= 0) value = value[..comment].TrimEnd(); }
            values.Add(key, value);
        }
        return values;
    }
    public static Dictionary<string, string> ReadRoot()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory != null; directory = directory.Parent)
        {
            if (File.Exists(Path.Combine(directory.FullName, "package.json")) && Directory.Exists(Path.Combine(directory.FullName, "bridge")))
                return Parse(File.ReadAllText(Path.Combine(directory.FullName, ".env")));
        }
        throw new InvalidOperationException("No se encontró el .env del proyecto");
    }
}
