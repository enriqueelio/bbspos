"use client";

import * as React from "react";
import { Input, type InputProps } from "./input";

type PasswordInputProps = Omit<InputProps, "type"> & {
  /** Muestra el texto en claro (para el botón de ver/ocultar). */
  reveal?: boolean;
};

type MaskStyle = React.CSSProperties & {
  WebkitTextSecurity?: "disc" | "none";
};

/**
 * Campo de contraseña que evita el aviso "¿Guardar la contraseña?" de Chrome.
 *
 * Chrome/Edge ignoran `autocomplete="off"` en los `input[type=password]` y, al
 * detectar un inicio de sesión, ofrecen guardar las credenciales. Si el motor
 * soporta enmascarar texto con CSS usamos `type="text"` +
 * `-webkit-text-security: disc`: el navegador no lo reconoce como contraseña y
 * no muestra el aviso. En motores sin ese soporte (p. ej. Firefox) caemos a
 * `type="password"` para no mostrar la contraseña en claro.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ reveal = false, style, ...props }, ref) => {
    const [canMaskWithCss, setCanMaskWithCss] = React.useState(false);

    React.useEffect(() => {
      setCanMaskWithCss(
        typeof CSS !== "undefined" &&
          CSS.supports("-webkit-text-security", "disc"),
      );
    }, []);

    const masked = canMaskWithCss && !reveal;

    return (
      <Input
        ref={ref}
        {...props}
        type={canMaskWithCss ? "text" : reveal ? "text" : "password"}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        style={
          masked
            ? ({ ...style, WebkitTextSecurity: "disc" } as MaskStyle)
            : style
        }
      />
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
