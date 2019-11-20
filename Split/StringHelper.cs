﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SpleeterAPI.Split
{
    public static class StringHelper
    {
        private static string Valid_Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        public static string SeededString(int seed, int size)
        {
            var stringChars = new char[size];
            var random = new Random(seed);
            for (int i = 0; i < stringChars.Length; i++)
            {
                stringChars[i] = Valid_Chars[random.Next(Valid_Chars.Length)];
            }
            var finalString = new String(stringChars);
            return finalString;
        }

        public static int GetStableHashCode(this string str)
        {
            unchecked
            {
                int hash1 = 5381;
                int hash2 = hash1;

                for (int i = 0; i < str.Length && str[i] != '\0'; i += 2)
                {
                    hash1 = ((hash1 << 5) + hash1) ^ str[i];
                    if (i == str.Length - 1 || str[i + 1] == '\0')
                        break;
                    hash2 = ((hash2 << 5) + hash2) ^ str[i + 1];
                }

                return hash1 + (hash2 * 1566083941);
            }
        }

    }
}
