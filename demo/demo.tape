# VHS demo tape for rn-bundle-swapper
# Run from project root: vhs demo/demo.tape

Output img/demo.gif

Set Shell zsh
Set FontSize 15
Set Width 960
Set Height 600
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms
Set WindowBar Colorful

# Source PATH setup (hidden from viewer)
Hide
Type "source demo/.zshenv"
Enter
Sleep 300ms
Type "clear"
Enter
Sleep 300ms
Show

# -- Scene 1: Show help --
Sleep 300ms
Type "rn-bundle-swapper --help"
Sleep 300ms
Enter
Sleep 4s

# -- Scene 2: Swap a bundle in an Android APK --
Type "rn-bundle-swapper android app-release.apk \"
Enter
Sleep 200ms
Type "  --jsbundle index.android.bundle \"
Enter
Sleep 200ms
Type "  --keystore debug.keystore --ks-pass android --ks-alias androiddebugkey"
Sleep 400ms
Enter
Sleep 9s

# Hold final frame
Sleep 2s
