export default function AppLoading() {
  return (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          border: "2px solid rgba(255,92,157,0.25)",
          borderTopColor: "#ff5c9d",
          borderRadius: "50%",
          animation: "app-route-spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes app-route-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
