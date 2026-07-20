import Swal from "sweetalert2";

// Homes.ph themed SweetAlert2 — follows the app's light/dark design tokens.
// Visual styling lives in globals.css under `.hph-swal` so it stays in sync
// with the theme (see the SweetAlert section there).
export const HomesSwal = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  customClass: {
    popup: "hph-swal",
    title: "hph-swal-title",
    htmlContainer: "hph-swal-body",
    confirmButton: "hph-swal-confirm",
    cancelButton: "hph-swal-cancel",
    denyButton: "hph-swal-deny",
    validationMessage: "hph-swal-validation",
    actions: "hph-swal-actions",
  },
});

export default HomesSwal;
