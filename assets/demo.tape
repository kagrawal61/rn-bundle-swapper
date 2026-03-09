# VHS tape — generates assets/demo.gif
# Run: vhs assets/demo.tape

Output assets/demo.gif

Set Shell "bash"
Set FontSize 14
Set FontFamily "JetBrains Mono"
Set Width 740
Set Height 380
Set Theme "Catppuccin Mocha"
Set Padding 24
Set TypingSpeed 40ms
Set PlaybackSpeed 0.9

Hide
Type "clear"
Enter
Show

Sleep 500ms

Type "bash assets/_demo_mock.sh"
Enter

Sleep 6500ms
